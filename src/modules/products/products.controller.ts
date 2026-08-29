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
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { RestockProductDto } from './dto/restock-product.dto.js';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Products Controller — handles pharmacy catalog, stock-in restock, smart alerts, and prescription endpoints.
 *
 * RBAC: Restricted to PHARMACIST, SUPERADMIN, and MASTERADMIN roles.
 * Prefix: /products
 */
@Controller('products')
@Roles('PHARMACIST', 'SUPERADMIN', 'MASTERADMIN')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /products
   * Get all products catalog with search, category filtering, and stock status.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() queryDto: QueryProductDto) {
    return this.productsService.findAllProducts(queryDto);
  }

  /**
   * GET /products/alerts
   * Get smart alerts for low stock and near expiry products.
   */
  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  async getAlerts() {
    return this.productsService.getAlerts();
  }

  /**
   * GET /products/prescriptions/pending
   * Alias endpoint for pending prescriptions under /products prefix.
   */
  @Get('prescriptions/pending')
  @HttpCode(HttpStatus.OK)
  async getPendingPrescriptionsAlias() {
    return this.productsService.findPendingPrescriptions();
  }

  /**
   * POST /products/prescriptions/:id/dispense
   * Alias endpoint for dispensing prescription under /products prefix.
   */
  @Post('prescriptions/:id/dispense')
  @HttpCode(HttpStatus.OK)
  async dispensePrescriptionAlias(
    @Req() request: Request,
    @Param('id') recipeId: string,
    @Body() dto: DispensePrescriptionDto,
  ) {
    const user = (request as any).user;
    return this.productsService.dispensePrescription(user.id, recipeId, dto);
  }

  /**
   * GET /products/:id
   * Get detailed product master data and inventory logs.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.productsService.findProductById(id);
  }

  /**
   * POST /products
   * Add a new product to master catalog.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() request: Request, @Body() createDto: CreateProductDto) {
    const user = (request as any).user;
    return this.productsService.createProduct(user.id, createDto);
  }

  /**
   * PATCH /products/:id
   * Update product basic info and prices.
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, updateDto);
  }

  /**
   * PATCH /products/:id/restock
   * Add physical stock-in, purchase price, supplier, and expiration date.
   */
  @Patch(':id/restock')
  @HttpCode(HttpStatus.OK)
  async restock(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() restockDto: RestockProductDto,
  ) {
    const user = (request as any).user;
    return this.productsService.restockProduct(user.id, id, restockDto);
  }
}
