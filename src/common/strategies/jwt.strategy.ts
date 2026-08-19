import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Request } from 'express';

/**
 * JWT Strategy — extracts JWT from HTTP-only cookie instead of Authorization header.
 * This is more secure against XSS token theft.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: (req: Request) => {
        if (!req || !req.cookies) return null;
        return req.cookies['access_token'] as string | null;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'medsync-jwt-secret-change-in-production',
    });
  }

  /**
   * Called after JWT is verified. Payload contains { sub: userId, email, role }.
   * Returns the user object that will be attached to request.user.
   */
  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    return user;
  }
}
