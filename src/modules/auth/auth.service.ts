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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) { }

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

    // Auto-generate medical record number: MRN-YYYYMMDD-XXXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
    const medicalRecordNumber = `MRN-${dateStr}-${randomSuffix}`;

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
   * 3. Generate JWT access token (15 min)
   * 4. If remember_me, generate remember_token (30 days in DB)
   * 5. Generate CSRF token for double-submit cookie pattern
   *
   * Returns tokens object for the controller to set as cookies.
   */
  async login(loginDto: LoginDto) {
    // Find user by email and role
    const user = await this.usersService.findByEmail(
      loginDto.email,
      loginDto.role,
    );

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
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Generate CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // Handle remember_me
    let rememberToken: string | null = null;
    if (loginDto.remember_me) {
      // Generate random remember token
      rememberToken = crypto.randomBytes(64).toString('hex');

      // Hash it before storing in DB
      const hashedRememberToken = crypto
        .createHash('sha256')
        .update(rememberToken)
        .digest('hex');

      // Store in DB with 30-day expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await this.usersService.updateRememberToken(
        user.id,
        hashedRememberToken,
        expiresAt,
      );
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
      },
    };
  }

  /**
   * Manually refresh the JWT using a remember_me token.
   * Validates the token from cookie against the hashed version in DB.
   * If valid, generates a new 15-minute JWT.
   */
  async refreshToken(rememberTokenFromCookie: string) {
    if (!rememberTokenFromCookie) {
      throw new UnauthorizedException('Remember token tidak ditemukan');
    }

    // Hash the cookie token to compare with DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(rememberTokenFromCookie)
      .digest('hex');

    // Find user with matching & non-expired remember_token
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
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Remember token expired atau tidak valid, silakan login ulang',
      );
    }

    // Generate new JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Generate new CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    return {
      accessToken,
      csrfToken,
      user,
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
   * Get current user profile from JWT payload.
   */
  async getProfile(userId: string, rememberTokenFromCookie: string) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(rememberTokenFromCookie)
      .digest('hex');

    const user = await (this.prisma as any).user.findFirst({
      where: {
        remember_token: hashedToken,
        remember_token_expires: {
          gt: new Date(),
        },
        id: userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employee: {
          select: {
            staff_code: true
          }
        }
      },
    });

    if (!user) {
      throw new UnauthorizedException('Silakan login ulang');
    }

    return {
      statusCode: 200,
      message: 'Profil berhasil diambil',
      data: user,
    };
  }
}
