import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * JWT Strategy — extracts JWT from the Authorization: Bearer <token> header.
 *
 * The frontend is responsible for storing the JWT (in memory/state) and
 * attaching it as `Authorization: Bearer <token>` on every protected request.
 * The remember_me opaque token remains in an HttpOnly cookie for silent refresh.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'medsync-jwt-secret-change-in-production',
    });
  }

  /**
   * Called after JWT is verified. Payload contains { sub: userId, role }.
   * Returns the user object that will be attached to request.user.
   */
  async validate(payload: { sub: string; role: string }) {
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
