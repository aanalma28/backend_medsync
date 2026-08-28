import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateDepartmenDto } from './dto/create-departmen.dto.js';
import { UpdateDepartmenDto } from './dto/update-departmen.dto.js';
import { QueryDepartmenDto } from './dto/query-departmen.dto.js';

@Injectable()
export class DepartmenService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper cast for Prisma client access
  private get db() {
    return this.prisma as any;
  }

  /**
   * Create a new department.
   */
  async create(createDto: CreateDepartmenDto) {
    const existing = await this.db.departmen.findFirst({
      where: {
        departmen_code: {
          equals: createDto.departmen_code,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Kode departmen '${createDto.departmen_code}' sudah digunakan`,
      );
    }

    const departmen = await this.db.departmen.create({
      data: {
        name: createDto.name,
        departmen_code: createDto.departmen_code,
        address: createDto.address,
        city: createDto.city,
        is_active: createDto.is_active ?? true,
      },
    });

    return {
      statusCode: 201,
      message: 'Departmen berhasil ditambahkan',
      data: departmen,
    };
  }

  /**
   * Find all departments with search, is_active filter, and pagination support.
   */
  async findAll(query: QueryDepartmenDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.is_active !== undefined && query.is_active !== '') {
      where.is_active = query.is_active === 'true';
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { departmen_code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.departmen.count({ where }),
      this.db.departmen.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { employees: true },
          },
        },
      }),
    ]);

    const formattedData = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      departmen_code: item.departmen_code,
      address: item.address,
      city: item.city,
      is_active: item.is_active,
      employee_count: item._count?.employees ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil daftar departmen',
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
   * Find department detail by ID.
   */
  async findOne(id: string) {
    const departmen = await this.db.departmen.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            staff_code: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!departmen) {
      throw new NotFoundException('Departmen tidak ditemukan');
    }

    return {
      statusCode: 200,
      message: 'Berhasil mengambil detail departmen',
      data: {
        id: departmen.id,
        name: departmen.name,
        departmen_code: departmen.departmen_code,
        address: departmen.address,
        city: departmen.city,
        is_active: departmen.is_active,
        employee_count: departmen._count?.employees ?? 0,
        employees: departmen.employees,
        createdAt: departmen.createdAt,
        updatedAt: departmen.updatedAt,
      },
    };
  }

  /**
   * Update department by ID.
   */
  async update(id: string, updateDto: UpdateDepartmenDto) {
    // Check existence
    await this.findOne(id);

    // If updating departmen_code, check for duplicates
    if (updateDto.departmen_code) {
      const existingCode = await this.db.departmen.findFirst({
        where: {
          departmen_code: {
            equals: updateDto.departmen_code,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (existingCode) {
        throw new ConflictException(
          `Kode departmen '${updateDto.departmen_code}' sudah digunakan oleh departmen lain`,
        );
      }
    }

    const updated = await this.db.departmen.update({
      where: { id },
      data: updateDto,
    });

    return {
      statusCode: 200,
      message: 'Departmen berhasil diperbarui',
      data: updated,
    };
  }

  /**
   * Remove (soft delete / deactivate) department by ID.
   */
  async remove(id: string) {
    // Check existence
    await this.findOne(id);

    const updated = await this.db.departmen.update({
      where: { id },
      data: { is_active: false },
    });

    return {
      statusCode: 200,
      message: 'Departmen berhasil dinonaktifkan',
      data: updated,
    };
  }
}
