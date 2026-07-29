import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { Request } from 'express';

/**
 * CSRF Protection Guard.
 *
 * Uses the Double Submit Cookie pattern:
 * - On login, the server sets a `csrf_token` cookie (NOT HttpOnly, so JS can read it)
 * - For every mutating request (POST, PUT, PATCH, DELETE), the client must send
 *   the same token in the `X-CSRF-Token` header
 * - This guard compares the cookie value with the header value
 *
 * Safe methods (GET, HEAD, OPTIONS) are always allowed.
 * Routes marked with @Public() still require CSRF for non-safe methods
 * EXCEPT for /auth/login and /auth/register which are exempted.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
  private readonly EXEMPT_PATHS = ['/auth/login', '/auth/register'];

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Safe methods don't need CSRF protection
    if (this.SAFE_METHODS.includes(request.method)) {
      return true;
    }

    // Exempt paths (login/register don't have CSRF token yet)
    if (this.EXEMPT_PATHS.includes(request.path)) {
      return true;
    }

    // Check if route is public AND not a mutating endpoint
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Validate CSRF token: compare cookie with header
    const cookieToken = request.cookies?.['csrf_token'] as string | undefined;
    const headerToken = request.headers['x-csrf-token'] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token tidak valid');
    }

    return true;
  }
}
