import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProductsService } from './products.service.js';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto.js';
import { QueryPrescriptionDto } from './dto/query-prescription.dto.js';
import { CancelPrescriptionDto } from './dto/cancel-prescription.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Prescriptions Controller — handles pharmacy prescription management, fulfillment, and cancellation.
 *
 * RBAC: Restricted to PHARMACIST, APOTHEKER, SUPERADMIN, and MASTERADMIN roles.
 * Prefix: /prescriptions
 */
@Controller('prescriptions')
@Roles('PHARMACIST', 'APOTHEKER', 'SUPERADMIN', 'MASTERADMIN')
export class PrescriptionsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /prescriptions
   * Get all doctor prescriptions matching the logged-in pharmacist's hospital with pagination & filtering.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllPrescriptions(
    @Req() request: Request,
    @Query() query: QueryPrescriptionDto,
  ) {
    const user = (request as any).user;
    return this.productsService.findPrescriptionsByHospital(user.id, query);
  }

  /**
   * GET /prescriptions/hospital
   * Alias endpoint: Get doctor prescriptions for logged-in pharmacist's hospital.
   */
  @Get('hospital')
  @HttpCode(HttpStatus.OK)
  async getPrescriptionsByHospital(
    @Req() request: Request,
    @Query() query: QueryPrescriptionDto,
  ) {
    const user = (request as any).user;
    return this.productsService.findPrescriptionsByHospital(user.id, query);
  }

  /**
   * GET /prescriptions/pending
   * Shortcut endpoint: Get pending prescriptions waiting to be dispensed.
   */
  @Get('pending')
  @HttpCode(HttpStatus.OK)
  async getPendingPrescriptions(@Req() request: Request) {
    const user = (request as any).user;
    return this.productsService.findPendingPrescriptions(user?.id);
  }

  /**
   * GET /prescriptions/:id
   * Get specific prescription details with hospital isolation check.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPrescriptionById(
    @Req() request: Request,
    @Param('id') recipeId: string,
  ) {
    const user = (request as any).user;
    return this.productsService.findPrescriptionById(user.id, recipeId);
  }

  /**
   * POST /prescriptions/:id/dispense
   * Process prescription fulfillment, reduce product inventory automatically, and complete recipe status.
   */
  @Post(':id/dispense')
  @HttpCode(HttpStatus.OK)
  async dispensePrescription(
    @Req() request: Request,
    @Param('id') recipeId: string,
    @Body() dto: DispensePrescriptionDto,
  ) {
    const user = (request as any).user;
    return this.productsService.dispensePrescription(user.id, recipeId, dto);
  }

  /**
   * PATCH /prescriptions/:id/cancel
   * Cancel prescription if medication cannot be fulfilled, setting status to CANCELLED.
   */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPrescription(
    @Req() request: Request,
    @Param('id') recipeId: string,
    @Body() dto: CancelPrescriptionDto,
  ) {
    const user = (request as any).user;
    return this.productsService.cancelPrescription(user.id, recipeId, dto);
  }
}
