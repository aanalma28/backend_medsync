import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { CreateStaffDto, StaffRole } from './dto/create-staff.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import {
  generateMedicalRecordNumber,
  generateStaffCode,
} from '../../common/utils/code-generator.util.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast helper — Prisma v7 with custom output path
  private get db() {
    return this.prisma as any;
  }

  /**
   * Find a user by email and role.
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
   * Store hashed remember_me token with expiry.
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

  /**
   * Create Patient User (Admin / Superadmin dashboard pathway)
   */
  async createPatient(createPatientDto: CreatePatientDto) {
    const existingUser = await this.findByEmail(createPatientDto.email);
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(createPatientDto.password, 10);
    const medicalRecordNumber = generateMedicalRecordNumber();

    const result = await this.db.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: createPatientDto.name,
          email: createPatientDto.email,
          password: hashedPassword,
          role: 'PATIENT',
          accepted_terms: createPatientDto.accepted_terms ?? true,
          phone: createPatientDto.phone,
          address: createPatientDto.address,
          birth_date: new Date(createPatientDto.birth_date),
          is_active: true,
        },
      });

      const patient = await tx.patient.create({
        data: {
          user_id: user.id,
          medical_record_number: medicalRecordNumber,
        },
      });

      return {
        ...user,
        patientUser: patient,
      };
    });

    const { password, remember_token, remember_token_expires, ...userData } =
      result;
    return userData;
  }

  /**
   * Create Staff User (Superadmin dashboard pathway)
   */
  async createStaff(createStaffDto: CreateStaffDto) {
    if (createStaffDto.role === ('PATIENT' as any)) {
      throw new BadRequestException(
        'Gunakan endpoint pembuatan pasien untuk membuat akun pasien',
      );
    }

    const existingUser = await this.findByEmail(createStaffDto.email);
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const departmen = await this.db.departmen.findUnique({
      where: { id: createStaffDto.departmen_id },
    });

    if (!departmen) {
      throw new NotFoundException('Departmen tidak ditemukan');
    }

    const hashedPassword = await bcrypt.hash(createStaffDto.password, 10);
    const staffCode = generateStaffCode(departmen.departmen_code);

    // Fallback address to departmen address if empty or not provided
    const resolvedAddress =
      createStaffDto.address && createStaffDto.address.trim() !== ''
        ? createStaffDto.address
        : `${departmen.address}, ${departmen.city}`;

    const result = await this.db.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: createStaffDto.name,
          email: createStaffDto.email,
          password: hashedPassword,
          role: createStaffDto.role,
          accepted_terms: true,
          phone: createStaffDto.phone,
          address: resolvedAddress,
          birth_date: new Date(createStaffDto.birth_date),
          is_active: true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          user_id: user.id,
          staff_code: staffCode,
          departmen_id: departmen.id,
        },
        include: {
          departmen: true,
        },
      });

      return {
        ...user,
        employeeUser: employee,
      };
    });

    const { password, remember_token, remember_token_expires, ...userData } =
      result;
    return userData;
  }

  /**
   * Find all users with search, role filter, department filter, active status, and pagination.
   */
  async findAll(query: QueryUserDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.is_active !== undefined && query.is_active !== '') {
      where.is_active = query.is_active === 'true';
    }

    if (query.departmen_id) {
      where.employeeUser = {
        departmen_id: query.departmen_id,
      };
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        {
          employeeUser: {
            staff_code: { contains: search, mode: 'insensitive' },
          },
        },
        {
          patientUser: {
            medical_record_number: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          birth_date: true,
          is_active: true,
          accepted_terms: true,
          createdAt: true,
          updatedAt: true,
          patientUser: {
            select: {
              id: true,
              medical_record_number: true,
            },
          },
          employeeUser: {
            select: {
              id: true,
              staff_code: true,
              departmen_id: true,
              departmen: {
                select: {
                  id: true,
                  name: true,
                  departmen_code: true,
                  address: true,
                  city: true,
                },
              },
            },
          },
        },
      }),
      this.db.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Find single user by ID.
   */
  async findById(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        birth_date: true,
        is_active: true,
        accepted_terms: true,
        createdAt: true,
        updatedAt: true,
        patientUser: {
          select: {
            id: true,
            medical_record_number: true,
          },
        },
        employeeUser: {
          select: {
            id: true,
            staff_code: true,
            departmen_id: true,
            departmen: {
              select: {
                id: true,
                name: true,
                departmen_code: true,
                address: true,
                city: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  /**
   * Update user details with role permission checks.
   */
  async update(
    targetId: string,
    updateDto: UpdateUserDto,
    currentUser: { id: string; role: string },
  ) {
    const targetUser = await this.db.user.findUnique({
      where: { id: targetId },
      include: {
        employeeUser: true,
        patientUser: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const isSelfUpdate = targetId === currentUser.id;
    const isSuperAdmin = currentUser.role === 'SUPERADMIN';
    const isAdmin =
      currentUser.role === 'REGISTER_ADMIN' ||
      currentUser.role === 'MASTERADMIN';

    // Permission validations
    if (!isSelfUpdate && !isSuperAdmin && !isAdmin) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk mengubah data user ini',
      );
    }

    // Admin (REGISTER_ADMIN / MASTERADMIN) can ONLY update PATIENT role users
    if (!isSelfUpdate && isAdmin && !isSuperAdmin) {
      if (targetUser.role !== 'PATIENT') {
        throw new ForbiddenException(
          'Admin hanya memiliki izin untuk mengelola data akun pasien',
        );
      }
      if (updateDto.role && updateDto.role !== 'PATIENT') {
        throw new ForbiddenException(
          'Admin tidak dapat mengubah role pasien menjadi staff',
        );
      }
    }

    // Check email uniqueness if email is changed
    if (updateDto.email && updateDto.email !== targetUser.email) {
      const existingEmail = await this.findByEmail(updateDto.email);
      if (existingEmail && existingEmail.id !== targetId) {
        throw new ConflictException('Email sudah digunakan oleh akun lain');
      }
    }

    const updateData: any = {};

    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.email !== undefined) updateData.email = updateDto.email;
    if (updateDto.phone !== undefined) updateData.phone = updateDto.phone;
    if (updateDto.address !== undefined) updateData.address = updateDto.address;
    if (updateDto.birth_date !== undefined)
      updateData.birth_date = new Date(updateDto.birth_date);

    // Password change handling
    if (updateDto.password) {
      if (isSelfUpdate) {
        updateData.password = await bcrypt.hash(updateDto.password, 10);
      } else if (isAdmin && targetUser.role === 'PATIENT') {
        updateData.password = await bcrypt.hash(updateDto.password, 10);
      } else if (isSuperAdmin) {
        updateData.password = await bcrypt.hash(updateDto.password, 10);
      } else {
        throw new ForbiddenException(
          'Anda tidak memiliki izin untuk mengubah password user ini',
        );
      }
    }

    // Role & is_active updates (Only Admin / Superadmin, not self-update)
    if (!isSelfUpdate) {
      if (updateDto.is_active !== undefined) {
        updateData.is_active = updateDto.is_active;
      }
      if (isSuperAdmin && updateDto.role !== undefined) {
        updateData.role = updateDto.role;
      }
    }

    // Perform database updates
    const updatedResult = await this.db.$transaction(async (tx: any) => {
      // Update User table
      const user = await tx.user.update({
        where: { id: targetId },
        data: updateData,
      });

      // If Superadmin updates departmen_id for Employee
      if (
        isSuperAdmin &&
        updateDto.departmen_id &&
        targetUser.employeeUser
      ) {
        const departmen = await tx.departmen.findUnique({
          where: { id: updateDto.departmen_id },
        });
        if (!departmen) {
          throw new NotFoundException('Departmen baru tidak ditemukan');
        }

        await tx.employee.update({
          where: { id: targetUser.employeeUser.id },
          data: {
            departmen_id: updateDto.departmen_id,
          },
        });
      }

      return user;
    });

    return this.findById(targetId);
  }

  /**
   * Delete / deactivate user with role permission checks.
   */
  async remove(targetId: string, currentUser: { id: string; role: string }) {
    const targetUser = await this.db.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const isSuperAdmin = currentUser.role === 'SUPERADMIN';
    const isAdmin =
      currentUser.role === 'REGISTER_ADMIN' ||
      currentUser.role === 'MASTERADMIN';

    if (!isSuperAdmin && !isAdmin) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk menghapus user',
      );
    }

    // Admin can ONLY delete PATIENT accounts
    if (isAdmin && !isSuperAdmin) {
      if (targetUser.role !== 'PATIENT') {
        throw new ForbiddenException(
          'Admin hanya memiliki izin untuk menghapus akun pasien',
        );
      }
    }

    // Superadmin CANNOT delete SUPERADMIN accounts (prevent lock-outs)
    if (isSuperAdmin && targetUser.role === 'SUPERADMIN') {
      throw new ForbiddenException(
        'Akun SuperAdmin tidak dapat dihapus melalui API ini',
      );
    }

    // Soft delete by deactivating user account
    await this.db.user.update({
      where: { id: targetId },
      data: { is_active: false },
    });

    return {
      statusCode: 200,
      message: `User ${targetUser.name || targetUser.email} berhasil dinonaktifkan`,
    };
  }
}