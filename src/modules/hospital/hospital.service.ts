import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateHospitalDto } from './dto/create-hospital.dto.js';
import { UpdateHospitalDto } from './dto/update-hospital.dto.js';
import { QueryHospitalDto } from './dto/query-hospital.dto.js';

@Injectable()
export class HospitalService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper cast for Prisma client access
  private get db() {
    return this.prisma as any;
  }

  /**
   * Create a new hospital/clinic.
   */
  async create(createDto: CreateHospitalDto, currentUserId?: string) {
    const existingCode = await this.db.hospital.findFirst({
      where: {
        hospital_code: {
          equals: createDto.hospital_code,
          mode: 'insensitive',
        },
      },
    });

    if (existingCode) {
      throw new ConflictException(
        `Kode hospital '${createDto.hospital_code}' sudah digunakan`,
      );
    }

    const userId = createDto.user_id || currentUserId;
    if (!userId) {
      throw new BadRequestException('User ID pemilik/pembuat hospital diperlukan');
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User pemilik/pembuat tidak ditemukan');
    }

    const hospital = await this.db.hospital.create({
      data: {
        name: createDto.name,
        hospital_code: createDto.hospital_code,
        address: createDto.address,
        user_id: userId,
        is_active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      statusCode: 201,
      message: 'Rumah sakit/klinik berhasil ditambahkan',
      data: hospital,
    };
  }

  /**
   * Find all hospitals with search, is_active filter, and pagination support.
   */
  async findAll(query: QueryHospitalDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.is_active !== undefined && query.is_active !== '') {
      where.is_active = query.is_active === 'true';
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { hospital_code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.hospital.count({ where }),
      this.db.hospital.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: { departments: true },
          },
        },
      }),
    ]);

    const formattedData = items.map((item: any) => ({
      id: item.id,
      hospital_code: item.hospital_code,
      name: item.name,
      address: item.address,
      is_active: item.is_active,
      user_id: item.user_id,
      owner: item.user,
      department_count: item._count?.departments ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil daftar rumah sakit/klinik',
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Find hospital detail by ID.
   */
  async findOne(id: string) {
    const hospital = await this.db.hospital.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        departments: {
          select: {
            id: true,
            name: true,
            departmen_code: true,
            is_active: true,
            createdAt: true,
          },
        },
        _count: {
          select: { departments: true },
        },
      },
    });

    if (!hospital) {
      throw new NotFoundException('Rumah sakit/klinik tidak ditemukan');
    }

    return {
      statusCode: 200,
      message: 'Berhasil mengambil detail rumah sakit/klinik',
      data: {
        id: hospital.id,
        hospital_code: hospital.hospital_code,
        name: hospital.name,
        address: hospital.address,
        is_active: hospital.is_active,
        user_id: hospital.user_id,
        owner: hospital.user,
        department_count: hospital._count?.departments ?? 0,
        departments: hospital.departments,
        createdAt: hospital.createdAt,
        updatedAt: hospital.updatedAt,
      },
    };
  }

  /**
   * Update hospital by ID.
   * If is_active is modified (set to true or false), cascades the status change to:
   * 1. All Departments under this Hospital
   * 2. All Users belonging to Employees in those Departments
   */
  async update(id: string, updateDto: UpdateHospitalDto) {
    await this.findOne(id);

    if (updateDto.hospital_code) {
      const existingCode = await this.db.hospital.findFirst({
        where: {
          hospital_code: {
            equals: updateDto.hospital_code,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (existingCode) {
        throw new ConflictException(
          `Kode hospital '${updateDto.hospital_code}' sudah digunakan oleh rumah sakit lain`,
        );
      }
    }

    if (updateDto.user_id) {
      const user = await this.db.user.findUnique({
        where: { id: updateDto.user_id },
      });

      if (!user) {
        throw new NotFoundException('User pemilik/pembuat baru tidak ditemukan');
      }
    }

    return this.db.$transaction(async (tx: any) => {
      const updated = await tx.hospital.update({
        where: { id },
        data: updateDto,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // If is_active flag is provided, cascade status to departments and employee users
      if (updateDto.is_active !== undefined) {
        const targetStatus = updateDto.is_active;

        const departments = await tx.departmen.findMany({
          where: { hospital_id: id },
          select: { id: true },
        });

        const departmentIds = departments.map((d: any) => d.id);

        if (departmentIds.length > 0) {
          // Cascade is_active to all departments under this hospital
          await tx.departmen.updateMany({
            where: { hospital_id: id },
            data: { is_active: targetStatus },
          });

          // Find all employees under these departments
          const employees = await tx.employee.findMany({
            where: { departmen_id: { in: departmentIds } },
            select: { user_id: true },
          });

          const userIds = employees
            .map((e: any) => e.user_id)
            .filter((uid: string) => uid);

          if (userIds.length > 0) {
            // Cascade is_active to all users in these departments
            await tx.user.updateMany({
              where: { id: { in: userIds } },
              data: { is_active: targetStatus },
            });
          }
        }
      }

      let message = 'Rumah sakit/klinik berhasil diperbarui';
      if (updateDto.is_active === true) {
        message = 'Rumah sakit/klinik beserta departmen dan staf terkait berhasil diaktifkan kembali';
      } else if (updateDto.is_active === false) {
        message = 'Rumah sakit/klinik beserta departmen dan staf terkait berhasil dinonaktifkan';
      }

      return {
        statusCode: 200,
        message,
        data: updated,
      };
    });
  }

  /**
   * Remove (soft delete / deactivate) hospital by ID.
   * Cascades soft delete (is_active = false) to Hospital, Departments, and Staff Users.
   */
  async remove(id: string) {
    return this.update(id, { is_active: false });
  }
}
