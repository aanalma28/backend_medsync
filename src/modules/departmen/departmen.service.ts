import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateDepartmenDto } from './dto/create-departmen.dto.js';
import { UpdateDepartmenDto } from './dto/update-departmen.dto.js';
import { QueryDepartmenDto } from './dto/query-departmen.dto.js';

@Injectable()
export class DepartmenService {
  constructor(private readonly prisma: PrismaService) { }

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
      },
    });

    return {
      statusCode: 201,
      message: 'Departmen berhasil ditambahkan',
      data: departmen,
    };
  }

  /**
   * Find all departments with search and pagination support.
   */
  async findAll(query: QueryDepartmenDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { departmen_code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
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
   * Remove department by ID.
   */
  async remove(id: string) {
    // Check existence
    await this.findOne(id);

    // Check if any employee belongs to this department
    const employeeCount = await this.db.employee.count({
      where: { departmen_id: id },
    });

    if (employeeCount > 0) {
      throw new BadRequestException(
        `Departmen tidak dapat dihapus karena masih terdapat ${employeeCount} pegawai yang terdaftar pada departmen ini`,
      );
    }

    await this.db.departmen.delete({
      where: { id },
    });

    return {
      statusCode: 200,
      message: 'Departmen berhasil dihapus',
    };
  }
}
