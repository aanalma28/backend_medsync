import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast helper — Prisma v7 with custom output path requires casting
  // PrismaClient extension to access model delegates
  private get db() {
    return this.prisma as any;
  }

  /**
   * Find a user by email and role.
   * Role is included because the same email could theoretically exist
   * across different roles (though email is unique in current schema).
   */
  async findByEmail(email: string, role?: string) {
    const where: any = { email };
    if (role) {
      where.role = role;
    }
    return this.db.user.findFirst({
      where,
    });
  }

  /**
   * Find a user by their ID.
   */
  async findById(id: string) {
    return this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        user_code: true,
        name: true,
        email: true,
        role: true,
        accepted_terms: true,
        createdAt: true,
      },
    });
  }

  /**
   * Create a new user with hashed password.
   */
  async create(data: {
    user_code: string;
    name: string;
    email: string;
    password: string;
    role: string;
    accepted_terms: boolean;
  }) {
    return this.db.user.create({
      data,
      select: {
        id: true,
        user_code: true,
        name: true,
        email: true,
        role: true,
        accepted_terms: true,
        createdAt: true,
      },
    });
  }

  /**
   * Store hashed remember_me token with 30-day expiry.
   */
  async updateRememberToken(
    userId: string,
    hashedToken: string,
    expires: Date,
  ) {
    return this.db.user.update({
      where: { id: userId },
      data: {
        remember_token: hashedToken,
        remember_token_expires: expires,
      },
    });
  }

  /**
   * Clear remember_me token on logout.
   */
  async clearRememberToken(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: {
        remember_token: null,
        remember_token_expires: null,
      },
    });
  }
}