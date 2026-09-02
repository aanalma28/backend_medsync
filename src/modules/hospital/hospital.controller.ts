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
import { HospitalService } from './hospital.service.js';
import { CreateHospitalDto } from './dto/create-hospital.dto.js';
import { UpdateHospitalDto } from './dto/update-hospital.dto.js';
import { QueryHospitalDto } from './dto/query-hospital.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { Request } from 'express';

@Controller('hospitals')
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}

  /**
   * POST /hospitals
   * Create a new hospital or clinic.
   * Access: SUPERADMIN, OWNER
   */
  @Post()
  @Roles('SUPERADMIN', 'OWNER')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateHospitalDto,
    @Req() req: Request,
  ) {
    const currentUser = (req as any).user;
    return this.hospitalService.create(createDto, currentUser?.id);
  }

  /**
   * GET /hospitals
   * Get list of all hospitals with search & pagination.
   * Access: All authenticated users
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryHospitalDto) {
    return this.hospitalService.findAll(query);
  }

  /**
   * GET /hospitals/:id
   * Get hospital detail by ID.
   * Access: All authenticated users
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.hospitalService.findOne(id);
  }

  /**
   * PATCH /hospitals/:id
   * Update hospital detail.
   * Access: SUPERADMIN, OWNER
   */
  @Patch(':id')
  @Roles('SUPERADMIN', 'OWNER')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateHospitalDto,
  ) {
    return this.hospitalService.update(id, updateDto);
  }

  /**
   * DELETE /hospitals/:id
   * Delete hospital by ID.
   * Access: SUPERADMIN
   */
  @Delete(':id')
  @Roles('SUPERADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.hospitalService.remove(id);
  }
}
