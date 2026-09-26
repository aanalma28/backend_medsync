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
import { LogisticsService } from './logistics.service.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { QueryWarehouseDto } from './dto/query-warehouse.dto.js';
import { CreatePurchaseDto } from './dto/create-purchase.dto.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto.js';
import { QueryStockDto } from './dto/query-stock.dto.js';
import { QueryInventoryLogDto } from './dto/query-inventory-log.dto.js';
import { UpdateMinStockDto } from './dto/update-min-stock.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Logistics Controller — supply chain, procurement, distribution, and global stock audit.
 *
 * Prefix: /logistics
 * RBAC: LOGISTIC (primary), plus OWNER / SUPERADMIN / MASTERADMIN for oversight.
 *
 * Tenant isolation: `hospital_id` SELALU di-resolve dari Employee ->
 * Departmen.hospital_id milik pengguna terautentikasi (fallback ke
 * Hospital.user_id). TIDAK PERNAH dibaca dari request body.
 *
 * CSRF: setiap POST/PATCH memerlukan header X-CSRF-Token yang cocok dengan
 * cookie csrf_token, atau CsrfGuard akan mengembalikan 403.
 */
@Controller('logistics')
@Roles('LOGISTIC', 'OWNER', 'SUPERADMIN', 'MASTERADMIN')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  // ─────────────────────────────────────────────
  // Master Warehouse / Depo
  // ─────────────────────────────────────────────

  /**
   * POST /logistics/warehouses
   * Membuat lokasi penyimpanan fisik (Gudang Utama / Depo Farmasi / Depo Lab / Poli / IGD).
   */
  @Post('warehouses')
  @HttpCode(HttpStatus.CREATED)
  async createWarehouse(
    @Req() request: Request,
    @Body() dto: CreateWarehouseDto,
  ) {
    const user = (request as any).user;
    return this.logisticsService.createWarehouse(user.id, dto);
  }

  /**
   * GET /logistics/warehouses
   * Daftar warehouse milik rumah sakit pemanggil.
   */
  @Get('warehouses')
  @HttpCode(HttpStatus.OK)
  async findWarehouses(
    @Req() request: Request,
    @Query() query: QueryWarehouseDto,
  ) {
    const user = (request as any).user;
    return this.logisticsService.findWarehouses(user.id, query);
  }

  /**
   * GET /logistics/warehouses/:id
   * Detail warehouse beserta ringkasan stok.
   */
  @Get('warehouses/:id')
  @HttpCode(HttpStatus.OK)
  async findWarehouse(@Req() request: Request, @Param('id') id: string) {
    const user = (request as any).user;
    return this.logisticsService.findWarehouseById(user.id, id);
  }

  /**
   * PATCH /logistics/warehouses/:id
   * Memperbarui nama / tipe / deskripsi warehouse.
   */
  @Patch('warehouses/:id')
  @HttpCode(HttpStatus.OK)
  async updateWarehouse(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    const user = (request as any).user;
    return this.logisticsService.updateWarehouse(user.id, id, dto);
  }

  // ─────────────────────────────────────────────
  // Penerimaan Barang (PURCHASE)
  // ─────────────────────────────────────────────

  /**
   * POST /logistics/purchases
   * Mencatat barang masuk dari supplier ke sebuah warehouse (default Gudang Utama).
   * Multi-item: menambah WarehouseStock, upsert StockBatch, menulis baris PURCHASE.
   */
  @Post('purchases')
  @HttpCode(HttpStatus.CREATED)
  async createPurchase(
    @Req() request: Request,
    @Body() dto: CreatePurchaseDto,
  ) {
    const user = (request as any).user;
    return this.logisticsService.createPurchase(user.id, dto);
  }

  // ─────────────────────────────────────────────
  // Distribusi / Amprahan (TRANSFER)
  // ─────────────────────────────────────────────

  /**
   * POST /logistics/transfers
   * Memindahkan stok antar warehouse secara atomik. Menulis TRANSFER_OUT + TRANSFER_IN.
   */
  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  async createTransfer(
    @Req() request: Request,
    @Body() dto: CreateTransferDto,
  ) {
    const user = (request as any).user;
    return this.logisticsService.createTransfer(user.id, dto);
  }

  // ─────────────────────────────────────────────
  // Monitoring & Audit
  // ─────────────────────────────────────────────

  /**
   * GET /logistics/stocks
   * Stok real-time di seluruh warehouse, dengan filter low-stock dan ringkasan global.
   */
  @Get('stocks')
  @HttpCode(HttpStatus.OK)
  async findStocks(@Req() request: Request, @Query() query: QueryStockDto) {
    const user = (request as any).user;
    return this.logisticsService.findStocks(user.id, query);
  }

  /**
   * PATCH /logistics/stocks/min-stock
   * Mengatur ambang minimum stok per produk per lokasi.
   */
  @Patch('stocks/min-stock')
  @HttpCode(HttpStatus.OK)
  async updateMinStock(
    @Req() request: Request,
    @Body() dto: UpdateMinStockDto,
  ) {
    const user = (request as any).user;
    return this.logisticsService.updateMinStock(user.id, dto);
  }

  /**
   * GET /logistics/logs
   * Riwayat kronologis seluruh mutasi stok.
   */
  @Get('logs')
  @HttpCode(HttpStatus.OK)
  async findLogs(
    @Req() request: Request,
    @Query() query: QueryInventoryLogDto,
  ) {
    const user = (request as any).user;
    return this.logisticsService.findInventoryLogs(user.id, query);
  }

  // ─────────────────────────────────────────────
  // Stock Opname / Adjustment
  // ─────────────────────────────────────────────

  /**
   * POST /logistics/adjustments
   * Menyesuaikan stok sistem dengan hasil hitung fisik. Selisih dicatat sebagai ADJUSTMENT.
   */
  @Post('adjustments')
  @HttpCode(HttpStatus.OK)
  async createAdjustment(
    @Req() request: Request,
    @Body() dto: CreateAdjustmentDto,
  ) {
    const user = (request as any).user;
    return this.logisticsService.createAdjustment(user.id, dto);
  }
}
