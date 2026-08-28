import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { generateMedicalRecordNumber } from '../../common/utils/code-generator.util.js';

/**
 * Authentication Service — handles registration, login, token refresh, logout, and profile.
 *
 * Security model:
 * - JWT (15min) returned in JSON response body → client stores in memory and sends as Bearer header
 * - Remember token (30 days) stored as HttpOnly/Secure/SameSite=Lax cookie → used for silent JWT refresh
 * - Remember token is HMAC-SHA256 hashed (with REMEMBER_TOKEN_SECRET) before database storage
 * - CSRF protection via double-submit cookie pattern
 */
@Injectable()
export class AuthService {
  /**
   * The secret used for HMAC-SHA256 hashing of remember tokens.
   * Loaded once at service instantiation for performance.
   */
  private readonly rememberTokenSecret: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.rememberTokenSecret =
      process.env.REMEMBER_TOKEN_SECRET ||
      'medsync-remember-token-secret-change-in-production';
  }

  /**
   * Hash a raw token using HMAC-SHA256 with the remember token secret.
   * This provides stronger tamper-resistance than plain SHA-256 because
   * the attacker would need both the token AND the server-side secret.
   */
  private hmacHash(rawToken: string): string {
    return crypto
      .createHmac('sha256', this.rememberTokenSecret)
      .update(rawToken)
      .digest('hex');
  }

  /**
   * Register a new patient.
   *
   * 1. Check email uniqueness
   * 2. Hash password with bcrypt (10 rounds)
   * 3. Create User + Patient records in a single transaction
   * 4. Auto-generate medical_record_number
   */
  async register(registerDto: RegisterDto) {
    // Validate confirm_password
    if (registerDto.password !== registerDto.confirm_password) {
      throw new BadRequestException(
        'Password dan konfirmasi password tidak cocok',
      );
    }

    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Auto-generate medical record number: PTN-XXXXX
    const medicalRecordNumber = generateMedicalRecordNumber();

    // Create User + Patient in a transaction
    const result = await (this.prisma as any).$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: registerDto.name,
          email: registerDto.email,
          password: hashedPassword,
          role: registerDto.role,
          accepted_terms: registerDto.accepted_terms,
          phone: registerDto.phone,
          address: registerDto.address,
          birth_date: new Date(registerDto.birth_date),
        },
      });

      const patient = await tx.patient.create({
        data: {
          user_id: user.id,
          medical_record_number: medicalRecordNumber,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        birth_date: user.birth_date,
        medical_record_number: patient.medical_record_number,
        createdAt: user.createdAt,
      };
    });

    return {
      statusCode: 201,
      message: 'Registrasi pasien berhasil',
      data: result,
    };
  }

  /**
   * Login user and generate tokens.
   *
   * 1. Find user by email + role
   * 2. Verify password with bcrypt
   * 3. Generate JWT access token (15 min) → returned in JSON body
   * 4. If remember_me, generate opaque remember_token → HMAC-SHA256 hashed, stored in DB (30 days)
   * 5. Generate CSRF token for double-submit cookie pattern
   *
   * Returns tokens object for the controller to:
   *   - Include accessToken in JSON response body
   *   - Set rememberToken as HttpOnly cookie
   *   - Set csrfToken as non-HttpOnly cookie
   */
  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // Generate JWT access token (15 minutes)
    // Payload: sub (userId) + role — minimal claims for stateless auth
    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Generate CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // Handle remember_me
    let rememberToken: string | null = null;
    if (loginDto.remember_me) {
      // Generate cryptographically random opaque token (64 bytes → 128-char hex)
      rememberToken = crypto.randomBytes(64).toString('hex');

      // HMAC-SHA256 hash before storing in DB
      const hashedRememberToken = this.hmacHash(rememberToken);

      // Store in DB with 30-day expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await this.usersService.updateRememberToken(
        user.id,
        hashedRememberToken,
        expiresAt,
      );
    }

    if (!user.is_active) {
      throw new UnauthorizedException(
        'Akun Anda tidak aktif. Silahkan hubungi Admin untuk informasi lebih lanjut.'
      );
    }

    let user_code: string | null = null;
    if (user.role == "PATIENT") {
      const patientData = await this.prisma.patient.findUnique({
        where: {
          user_id: user.id,
        },
        select: {
          medical_record_number: true,
        },
      });
      user_code = patientData?.medical_record_number || null;
    } else {
      const employeeData = await this.prisma.employee.findUnique({
        where: {
          user_id: user.id,
        },
        select: {
          staff_code: true,
        },
      });
      user_code = employeeData?.staff_code || null;
    }

    return {
      accessToken,
      rememberToken,
      csrfToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        user_code: user_code,
      },
    };
  }

  /**
   * Refresh JWT using a remember_me opaque token from HttpOnly cookie.
   *
   * Flow:
   * 1. HMAC-SHA256 hash the cookie token
   * 2. Find user with matching remember_token WHERE remember_token_expires > NOW()
   * 3. If valid → issue new 15-minute JWT + CSRF token
   * 4. If invalid → nullify remember_token fields in DB, throw 401
   *
   * For non-patient users, includes staff_code from Employee relation.
   */
  async refreshToken(rememberTokenFromCookie: string) {
    if (!rememberTokenFromCookie) {
      throw new UnauthorizedException('Remember token tidak ditemukan');
    }

    // HMAC-SHA256 hash the cookie token to compare with DB
    const hashedToken = this.hmacHash(rememberTokenFromCookie);

    // Find user with matching & non-expired remember_token
    // LEFT JOIN with Employee to include staff_code for non-patient roles
    const user = await (this.prisma as any).user.findFirst({
      where: {
        remember_token: hashedToken,
        remember_token_expires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeUser: {
          select: {
            staff_code: true,
          },
        },
      },
    });

    if (!user) {
      // Token expired or invalid — nullify token fields in DB
      // We can't know which user this token belongs to (hash mismatch),
      // so we attempt cleanup by matching the hash (will be a no-op if not found)
      await (this.prisma as any).user.updateMany({
        where: { remember_token: hashedToken },
        data: {
          remember_token: null,
          remember_token_expires: null,
        },
      });

      throw new UnauthorizedException(
        'Remember token expired atau tidak valid, silakan login ulang',
      );
    }

    // Generate new JWT (15 minutes)
    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Generate new CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // Flatten the Employee relation for cleaner response
    const { employeeUser, ...userData } = user;

    return {
      accessToken,
      csrfToken,
      user: {
        ...userData,
        ...(employeeUser ? { staff_code: employeeUser.staff_code } : {}),
      },
    };
  }

  /**
   * Logout user — clear remember_token from DB.
   */
  async logout(userId: string) {
    await this.usersService.clearRememberToken(userId);

    return {
      statusCode: 200,
      message: 'Logout berhasil',
    };
  }

  /**
   * Get current user profile.
   *
   * Uses a LEFT JOIN with the Employee table (via Prisma include/select)
   * to include staff_code for non-patient users (dokter, apoteker, admin).
   * Patient users will have employeeUser as null.
   */
  async getProfile(userId: string) {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        birth_date: true,
        createdAt: true,
        // LEFT JOIN with Employee (1-to-1 via user_id)
        // Returns null for patients who have no Employee record
        employeeUser: {
          select: {
            staff_code: true,
          },
        },
        // LEFT JOIN with Patient (1-to-1 via user_id)
        patientUser: {
          select: {
            medical_record_number: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan, silakan login ulang');
    }

    // Flatten nested relations for a clean API response
    const { employeeUser, patientUser, ...userData } = user;
    const userCode = employeeUser?.staff_code || patientUser?.medical_record_number || user.id;

    return {
      statusCode: 200,
      message: 'Profil berhasil diambil',
      data: {
        ...userData,
        user_code: userCode,
        // Include staff_code for non-patient roles (dokter, apoteker, etc.)
        ...(employeeUser ? { staff_code: employeeUser.staff_code } : {}),
        // Include medical_record_number for patient role
        ...(patientUser
          ? { medical_record_number: patientUser.medical_record_number }
          : {}),
      },
    };
  }
}
