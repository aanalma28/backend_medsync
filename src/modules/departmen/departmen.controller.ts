import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmenService } from './departmen.service.js';
import { CreateDepartmenDto } from './dto/create-departmen.dto.js';
import { UpdateDepartmenDto } from './dto/update-departmen.dto.js';
import { QueryDepartmenDto } from './dto/query-departmen.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('departments')
export class DepartmenController {
  constructor(private readonly departmenService: DepartmenService) {}

  /**
   * POST /departments
   * Create a new department.
   * Access: SUPERADMIN, MASTERADMIN
   */
  @Post()
  @Roles('SUPERADMIN', 'MASTERADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateDepartmenDto) {
    return this.departmenService.create(createDto);
  }

  /**
   * GET /departments
   * Get all departments with optional search & pagination.
   * Access: All authenticated users
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryDepartmenDto) {
    return this.departmenService.findAll(query);
  }

  /**
   * GET /departments/:id
   * Get department detail by ID.
   * Access: All authenticated users
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.departmenService.findOne(id);
  }

  /**
   * PATCH /departments/:id
   * Update department by ID.
   * Access: SUPERADMIN, MASTERADMIN
   */
  @Patch(':id')
  @Roles('SUPERADMIN', 'MASTERADMIN')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDepartmenDto,
  ) {
    return this.departmenService.update(id, updateDto);
  }

  /**
   * DELETE /departments/:id
   * Delete department by ID.
   * Access: SUPERADMIN, MASTERADMIN
   */
  @Delete(':id')
  @Roles('SUPERADMIN', 'MASTERADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.departmenService.remove(id);
  }
}
