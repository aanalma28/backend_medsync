import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as crypto from 'crypto';
import type { Request, Response } from 'express';

/**
 * Global JWT Authentication Guard.
 *
 * Flow:
 * 1. Check if route is @Public() → skip auth
 * 2. Try standard JWT validation from cookie
 * 3. If JWT expired, check remember_token cookie → auto-refresh
 * 4. If no valid tokens → 401 Unauthorized
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Skip auth for @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. Try standard JWT validation
    try {
      const result = await (super.canActivate(context) as Promise<boolean>);
      return result;
    } catch {
      // JWT failed (expired or missing), try remember_me refresh
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      return this.tryRememberMeRefresh(request, response);
    }
  }

  /**
   * Attempt to auto-refresh the JWT using the remember_me token from cookies.
   * If the remember_token in the cookie matches the hashed token in DB
   * and hasn't expired (30 days), generate a new 15-minute JWT.
   */
  private async tryRememberMeRefresh(
    request: Request,
    response: Response,
  ): Promise<boolean> {
    const rememberToken = request.cookies?.['remember_token'] as
      | string
      | undefined;
    if (!rememberToken) {
      throw new UnauthorizedException('Token tidak valid atau sudah expired');
    }

    // Hash the cookie token to compare with DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(rememberToken)
      .digest('hex');

    // Find user with matching remember_token that hasn't expired
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
        createdAt: true,
      },
    });

    if (!user) {
      // Token expired or invalid — clear cookies
      response.clearCookie('access_token');
      response.clearCookie('remember_token');
      throw new UnauthorizedException(
        'Remember me token expired, silakan login ulang',
      );
    }

    // Generate new JWT (15 minutes)
    const payload = { sub: user.id, email: user.email, role: user.role };
    const newAccessToken = this.jwtService.sign(payload);

    // Set new access_token cookie
    response.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Attach user to request
    (request as any).user = user;

    return true;
  }
}
