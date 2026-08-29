import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProductsService } from './products.service.js';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Prescriptions Controller — handles pharmacy prescription fulfillment and automatic stock deduction.
 *
 * RBAC: Restricted to PHARMACIST, SUPERADMIN, and MASTERADMIN roles.
 * Prefix: /prescriptions
 */
@Controller('prescriptions')
@Roles('PHARMACIST', 'SUPERADMIN', 'MASTERADMIN')
export class PrescriptionsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /prescriptions/pending
   * Get list of pending prescriptions waiting to be dispensed by pharmacist.
   */
  @Get('pending')
  @HttpCode(HttpStatus.OK)
  async getPendingPrescriptions() {
    return this.productsService.findPendingPrescriptions();
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
}
