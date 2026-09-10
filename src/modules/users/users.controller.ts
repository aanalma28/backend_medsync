import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import {
  FamilyPatientDto,
  UpdateFamilyPatientDto,
} from './dto/family-patient.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('family/patients')
  @Roles('SUPERADMIN', 'REGISTER_ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.CREATED)
  async createFamilyPatient(
    @Body() familyPatientDto: FamilyPatientDto,
    @Req() req: Request,
  ) {
    const currentUser = (req as any).user;
    const data = await this.usersService.createFamilyPatient(
      familyPatientDto,
      currentUser,
    );
    return {
      statusCode: 201,
      message: 'Data pasien keluarga berhasil ditambahkan',
      data,
    };
  }

  @Get('family/patients')
  @Roles('SUPERADMIN', 'REGISTER_ADMIN', 'PATIENT')
  async findFamilyPatients(@Req() req: Request, @Query('user_id') userId?: string) {
    const currentUser = (req as any).user;
    const data = await this.usersService.findFamilyPatients(currentUser, userId);
    return {
      statusCode: 200,
      message: 'Data pasien keluarga berhasil diambil',
      data,
    };
  }

  @Get('family/patients/:id')
  @Roles('SUPERADMIN', 'REGISTER_ADMIN', 'PATIENT')
  async findFamilyPatient(@Param('id') id: string, @Req() req: Request) {
    const data = await this.usersService.findFamilyPatient(
      id,
      (req as any).user,
    );
    return {
      statusCode: 200,
      message: 'Detail pasien keluarga berhasil diambil',
      data,
    };
  }

  @Patch('family/patients/:id')
  @Roles('SUPERADMIN', 'REGISTER_ADMIN', 'PATIENT')
  async updateFamilyPatient(
    @Param('id') id: string,
    @Body() familyPatientDto: UpdateFamilyPatientDto,
    @Req() req: Request,
  ) {
    const data = await this.usersService.updateFamilyPatient(
      id,
      familyPatientDto,
      (req as any).user,
    );
    return {
      statusCode: 200,
      message: 'Data pasien keluarga berhasil diperbarui',
      data,
    };
  }

  @Delete('family/patients/:id')
  @Roles('SUPERADMIN', 'REGISTER_ADMIN', 'PATIENT')
  async removeFamilyPatient(@Param('id') id: string, @Req() req: Request) {
    const data = await this.usersService.removeFamilyPatient(
      id,
      (req as any).user,
    );
    return {
      statusCode: 200,
      message: 'Data pasien keluarga berhasil dinonaktifkan',
      data,
    };
  }

  /**
   * POST /users/patient
   * Endpoint for Admin & Superadmin to create a patient account.
   */
  @Post('patient')
  @Roles('SUPERADMIN', 'MASTERADMIN', 'REGISTER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createPatient(@Body() createPatientDto: CreatePatientDto) {
    const data = await this.usersService.createPatient(createPatientDto);
    return {
      statusCode: 201,
      message: 'Akun pasien berhasil dibuat',
      data,
    };
  }

  /**
   * POST /users/staff
   * Endpoint for Superadmin to create staff accounts.
   */
  @Post('staff')
  @Roles('SUPERADMIN', 'MASTERADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() createStaffDto: CreateStaffDto) {
    const data = await this.usersService.createStaff(createStaffDto);
    return {
      statusCode: 201,
      message: 'Akun staff berhasil dibuat',
      data,
    };
  }

  /**
   * GET /users
   * Endpoint for Admin & Superadmin to list all users with filters & search.
   */
  @Get()
  @Roles('SUPERADMIN', 'MASTERADMIN', 'REGISTER_ADMIN')
  async findAll(@Query() query: QueryUserDto) {
    const result = await this.usersService.findAll(query);
    return {
      statusCode: 200,
      message: 'Daftar user berhasil diambil',
      ...result,
    };
  }

  /**
   * PATCH /users/me
   * Endpoint for current logged-in user to update their own profile.
   */
  @Patch('me')
  async updateSelf(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const currentUser = (req as any).user;
    const data = await this.usersService.update(
      currentUser.id,
      updateUserDto,
      currentUser,
    );
    return {
      statusCode: 200,
      message: 'Profil berhasil diperbarui',
      data,
    };
  }

  /**
   * GET /users/:id
   * Endpoint to retrieve a specific user profile by ID.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.usersService.findById(id);
    return {
      statusCode: 200,
      message: 'Detail user berhasil diambil',
      data,
    };
  }

  /**
   * PATCH /users/:id
   * Endpoint for Admin & Superadmin to update a target user profile.
   */
  @Patch(':id')
  @Roles('SUPERADMIN', 'MASTERADMIN', 'REGISTER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const currentUser = (req as any).user;
    const data = await this.usersService.update(id, updateUserDto, currentUser);
    return {
      statusCode: 200,
      message: 'Data user berhasil diperbarui',
      data,
    };
  }

  /**
   * DELETE /users/:id
   * Endpoint for Admin & Superadmin to delete / deactivate a user profile.
   */
  @Delete(':id')
  @Roles('SUPERADMIN', 'MASTERADMIN', 'REGISTER_ADMIN')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const currentUser = (req as any).user;
    return await this.usersService.remove(id, currentUser);
  }
}
