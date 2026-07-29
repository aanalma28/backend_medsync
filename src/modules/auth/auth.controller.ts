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
 * Cookie-based JWT authentication:
 * - access_token: HttpOnly, Secure, SameSite=Lax, 15min
 * - remember_token: HttpOnly, Secure, SameSite=Lax, 30 days
 * - csrf_token: NOT HttpOnly (JS readable), SameSite=Lax
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
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
   * Sets JWT in HttpOnly cookie and optionally remember_token.
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

    // Set access_token cookie (HttpOnly, 15 minutes)
    response.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Set CSRF token cookie (NOT HttpOnly — JS must read it)
    response.cookie('csrf_token', result.csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
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

    return {
      statusCode: 200,
      message: 'Login berhasil',
      data: result.user,
    };
  }

  /**
   * POST /auth/logout
   * Requires authentication. Clears all auth cookies and DB remember_token.
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

    // Clear all auth cookies
    response.clearCookie('access_token', { path: '/' });
    response.clearCookie('remember_token', { path: '/' });
    response.clearCookie('csrf_token', { path: '/' });

    return result;
  }

  /**
   * POST /auth/refresh
   * Public endpoint — uses remember_token cookie to issue new JWT.
   * Rate limit: 10 requests per 60 seconds
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
    const result = await this.authService.refreshToken(rememberToken);

    // Set new access_token cookie
    response.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Set new CSRF token cookie
    response.cookie('csrf_token', result.csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    return {
      statusCode: 200,
      message: 'Token berhasil diperbarui',
      data: result.user,
    };
  }

  /**
   * GET /auth/me
   * Requires authentication. Returns current user profile.
   * Rate limit: 30 requests per 60 seconds
   */
  @Get('me')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getProfile(@Req() request: Request) {
    const user = (request as any).user;
    return this.authService.getProfile(user.id);
  }
}