import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Global JWT Authentication Guard.
 *
 * Flow:
 * 1. Check if route is @Public() → skip auth
 * 2. Validate JWT from Authorization: Bearer <token> header via Passport
 * 3. If JWT is missing, expired, or invalid → 401 Unauthorized
 *
 * The client is responsible for calling POST /auth/refresh with the
 * remember_me HttpOnly cookie to obtain a new JWT when it expires.
 * This separation keeps the guard stateless and the auth flow explicit.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
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

    // 2. Validate JWT via Passport JwtStrategy
    try {
      const result = await (super.canActivate(context) as Promise<boolean>);
      return result;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(
        'Token tidak valid atau sudah expired. Silakan refresh atau login ulang.',
      );
    }
  }
}
