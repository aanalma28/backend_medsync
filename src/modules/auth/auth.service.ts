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
   * Register a new user.
   *
   * 1. Check confirm_password matches password
   * 2. Check email uniqueness
   * 3. Hash password with bcrypt (10 rounds)
   * 4. Create user in database
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

    // Create user
    const user = await this.usersService.create({
      user_code: registerDto.user_code,
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      role: registerDto.role,
      accepted_terms: registerDto.accepted_terms,
    });

    return {
      statusCode: 201,
      message: 'Registrasi berhasil',
      data: user,
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
        user_code: user.user_code,
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
        user_code: true,
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
  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    return {
      statusCode: 200,
      message: 'Profil berhasil diambil',
      data: user,
    };
  }
}
