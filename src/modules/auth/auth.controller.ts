import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Request, Response } from 'express';

/**
 * Auth Controller — handles registration, login, logout, profile, and token refresh.
 *
 * Hybrid authentication model:
 * - JWT (15min): returned in JSON response body → client sends as Authorization: Bearer <token>
 * - remember_token (30 days): HttpOnly, Secure, SameSite=Lax cookie → used for silent refresh
 * - csrf_token: non-HttpOnly cookie (JS readable) for double-submit CSRF pattern
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Public endpoint — registers a new patient account.
   * Rate limit: 5 requests per 60 seconds
   */
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/login
   * Rate limit: 5 requests per 60 seconds (brute force protection)
   *
   * Response:
   * - JSON body: { statusCode, message, data: { accessToken, user } }
   * - Cookie: remember_token (HttpOnly, Secure, SameSite=Lax, 30 days) — only if remember_me is true
   * - Cookie: csrf_token (non-HttpOnly, SameSite=Lax, 15 min)
   */
  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set CSRF token cookie (NOT HttpOnly — JS must read it for double-submit pattern)
    response.cookie('csrf_token', result.csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes (aligned with JWT lifespan)
      path: '/',
    });

    // Set remember_token cookie if remember_me was true (HttpOnly, 30 days)
    if (result.rememberToken) {
      response.cookie('remember_token', result.rememberToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    }

    // JWT is returned in the JSON response body — NOT as a cookie
    return {
      statusCode: 200,
      message: 'Login berhasil',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  /**
   * POST /auth/logout
   * Requires authentication (JWT Bearer). Clears DB remember_token and auth cookies.
   */
  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = (request as any).user;
    const result = await this.authService.logout(user.id);

    // Clear remember_token and csrf_token cookies
    response.clearCookie('remember_token', { path: '/' });
    response.clearCookie('csrf_token', { path: '/' });

    return result;
  }

  /**
   * POST /auth/refresh
   * Public endpoint — uses remember_token HttpOnly cookie to issue a new JWT.
   * Rate limit: 10 requests per 60 seconds
   *
   * On success:
   * - JSON body: { statusCode, message, data: { accessToken, user } }
   * - Cookie: csrf_token (refreshed, 15 min)
   *
   * On failure (401):
   * - Clears remember_token cookie
   * - Nullifies remember_token fields in DB
   */
  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rememberToken = request.cookies?.['remember_token'] as string;

    try {
      const result = await this.authService.refreshToken(rememberToken);

      // Set new CSRF token cookie
      response.cookie('csrf_token', result.csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
      });

      // JWT is returned in the JSON response body
      return {
        statusCode: 200,
        message: 'Token berhasil diperbarui',
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      };
    } catch (error) {
      // On any auth failure, clear the remember_token cookie
      response.clearCookie('remember_token', { path: '/' });
      response.clearCookie('csrf_token', { path: '/' });
      throw error;
    }
  }

  /**
   * GET /auth/me
   * Requires authentication (JWT Bearer). Returns current user profile.
   * Includes staff_code for non-patient roles via LEFT JOIN with Employee.
   * Rate limit: 30 requests per 60 seconds
   */
  @Get('me')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getProfile(@Req() request: Request) {
    const user = (request as any).user;
    return this.authService.getProfile(user.id);
  }
}