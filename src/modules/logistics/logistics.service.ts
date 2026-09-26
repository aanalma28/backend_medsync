import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { QueryWarehouseDto } from './dto/query-warehouse.dto.js';
import { CreatePurchaseDto } from './dto/create-purchase.dto.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto.js';
import { QueryStockDto } from './dto/query-stock.dto.js';
import { QueryInventoryLogDto } from './dto/query-inventory-log.dto.js';
import { UpdateMinStockDto } from './dto/update-min-stock.dto.js';

/**
 * Logistics Service — supply chain, procurement, distribution, global stock audit.
 *
 * KONKURENSI: Prisma tidak menyediakan row locking. Setiap pemotongan stok
 * memakai CONDITIONAL UPDATE di dalam transaksi:
 *
 *   const res = await tx.warehouseStock.updateMany({
 *     where: { product_id, warehouse_id, stock: { gte: qty } },
 *     data:  { stock: { decrement: qty } },
 *   });
 *   if (res.count === 0) throw new BadRequestException('Stok tidak cukup');
 *
 * Pola read-then-write (findUnique -> cek -> update) AKAN oversell saat konkuren.
 */
@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  // ─────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────

  /**
   * Parse bilangan bulat positif dengan fallback.
   * `Math.max(1, parseInt('abc'))` menghasilkan NaN, yang akan dikirim ke
   * Prisma sebagai `skip: NaN` dan memicu error 500 — helper ini mencegahnya.
   */
  private toPositiveInt(value: unknown, fallback: number, max?: number): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }
    return max !== undefined ? Math.min(parsed, max) : parsed;
  }

  /**
   * Parse tanggal, melempar 400 alih-alih menyerahkan Invalid Date ke Prisma.
   */
  private toDate(value: string, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        `Format ${field} tidak valid (gunakan YYYY-MM-DD)`,
      );
    }
    return parsed;
  }

  /**
   * Resolve hospital_id pemanggil.
   *
   * Prioritas:
   *   1. Employee -> Departmen.hospital_id  (LOGISTIC, NURSE, PHARMACIST, ...)
   *   2. Hospital.user_id                   (OWNER)
   *
   * hospital_id TIDAK PERNAH diambil dari request body — jika ya, satu tenant
   * dapat menyetor stok ke warehouse tenant lain.
   */
  private async resolveHospitalId(userId: string): Promise<string> {
    if (!userId) {
      throw new ForbiddenException('Identitas pengguna tidak dikenali');
    }

    const employee = await this.db.employee.findUnique({
      where: { user_id: userId },
      select: {
        departmen: {
          select: { hospital_id: true },
        },
      },
    });

    if (employee?.departmen?.hospital_id) {
      return employee.departmen.hospital_id;
    }

    const hospital = await this.db.hospital.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });

    if (hospital?.id) {
      return hospital.id;
    }

    throw new ForbiddenException(
      'Akun Anda tidak terhubung ke rumah sakit mana pun',
    );
  }

  /**
   * Mengambil warehouse dan memastikan milik rumah sakit pemanggil.
   * Menerima transaction client agar dapat dipakai di dalam $transaction.
   */
  private async findWarehouseOrFail(
    tx: any,
    hospitalId: string,
    warehouseId: string,
  ) {
    const warehouse = await tx.warehouse.findFirst({
      where: { id: warehouseId, hospital_id: hospitalId },
      select: { id: true, name: true, type: true },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Warehouse tidak ditemukan atau bukan milik rumah sakit Anda',
      );
    }

    return warehouse;
  }

  /**
   * Resolve warehouse penerimaan. Default: Gudang Utama (type = MAIN).
   */
  private async resolveInboundWarehouse(
    tx: any,
    hospitalId: string,
    warehouseId?: string,
  ) {
    if (warehouseId) {
      return this.findWarehouseOrFail(tx, hospitalId, warehouseId);
    }

    const mainWarehouse = await tx.warehouse.findFirst({
      where: { hospital_id: hospitalId, type: 'MAIN' },
      select: { id: true, name: true, type: true },
    });

    if (!mainWarehouse) {
      throw new BadRequestException(
        'Gudang Utama belum terdaftar untuk rumah sakit ini. Buat warehouse dengan tipe MAIN terlebih dahulu.',
      );
    }

    return mainWarehouse;
  }

  /**
   * Memvalidasi bahwa seluruh produk milik rumah sakit pemanggil, dan tidak ada
   * produk yang dicantumkan dua kali (yang akan menggandakan mutasi).
   */
  private async loadProductsOrFail(
    tx: any,
    hospitalId: string,
    productIds: string[],
  ) {
    const uniqueIds = [...new Set(productIds)];

    if (uniqueIds.length !== productIds.length) {
      throw new BadRequestException(
        'Terdapat produk yang dicantumkan lebih dari satu kali dalam satu payload',
      );
    }

    const products = await tx.products.findMany({
      where: { id: { in: uniqueIds }, hospital_id: hospitalId },
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        category: true,
        buy_price: true,
      },
    });

    if (products.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Terdapat produk yang tidak ditemukan atau bukan milik rumah sakit Anda',
      );
    }

    return new Map<string, any>(products.map((p: any) => [p.id, p]));
  }

  // ─────────────────────────────────────────────
  // 1. Master Warehouse / Depo
  // ─────────────────────────────────────────────

  async createWarehouse(userId: string, dto: CreateWarehouseDto) {
    const hospitalId = await this.resolveHospitalId(userId);
    const warehouseType = dto.type || 'OTHER';

    const duplicateName = await this.db.warehouse.findFirst({
      where: { hospital_id: hospitalId, name: dto.name },
      select: { id: true },
    });

    if (duplicateName) {
      throw new ConflictException(
        `Warehouse dengan nama "${dto.name}" sudah terdaftar di rumah sakit ini`,
      );
    }

    if (warehouseType === 'MAIN') {
      const existingMain = await this.db.warehouse.findFirst({
        where: { hospital_id: hospitalId, type: 'MAIN' },
        select: { id: true, name: true },
      });

      if (existingMain) {
        throw new ConflictException(
          `Gudang Utama sudah terdaftar dengan nama "${existingMain.name}"`,
        );
      }
    }

    const warehouse = await this.db.warehouse.create({
      data: {
        hospital_id: hospitalId,
        name: dto.name,
        type: warehouseType,
        description: dto.description || null,
      },
    });

    return {
      statusCode: 201,
      message: 'Warehouse berhasil ditambahkan',
      data: warehouse,
    };
  }

  async findWarehouses(userId: string, query: QueryWarehouseDto) {
    const hospitalId = await this.resolveHospitalId(userId);
    const page = this.toPositiveInt(query.page, 1);
    const limit = this.toPositiveInt(query.limit, 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { hospital_id: hospitalId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, warehouses] = await Promise.all([
      this.db.warehouse.count({ where }),
      this.db.warehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { stocks: true } },
        },
      }),
    ]);

    const warehouseIds = warehouses.map((w: any) => w.id);

    const totals: any[] = warehouseIds.length
      ? await this.db.$queryRaw`
          SELECT "warehouse_id", COALESCE(SUM("stock"), 0)::int AS "total_stock"
          FROM "WarehouseStock"
          WHERE "warehouse_id" IN (${warehouseIds})
          GROUP BY "warehouse_id"
        `
      : [];

    const totalMap = new Map<string, number>(
      totals.map((row: any) => [row.warehouse_id, Number(row.total_stock)]),
    );

    const data = warehouses.map((w: any) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      description: w.description,
      is_main: w.type === 'MAIN',
      distinct_product_count: w._count?.stocks ?? 0,
      total_stock_quantity: totalMap.get(w.id) ?? 0,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil daftar warehouse',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findWarehouseById(userId: string, warehouseId: string) {
    const hospitalId = await this.resolveHospitalId(userId);

    const warehouse = await this.db.warehouse.findFirst({
      where: { id: warehouseId, hospital_id: hospitalId },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Warehouse tidak ditemukan atau bukan milik rumah sakit Anda',
      );
    }

    const summaryResult: any[] = await this.db.$queryRaw`
      SELECT
        COUNT(*)::int AS "distinct_product_count",
        COALESCE(SUM("stock"), 0)::int AS "total_stock_quantity",
        COUNT(*) FILTER (WHERE "stock" <= "min_stock")::int AS "low_stock_count",
        COUNT(*) FILTER (WHERE "stock" = 0)::int AS "out_of_stock_count"
      FROM "WarehouseStock"
      WHERE "warehouse_id" = ${warehouseId}
    `;

    const summary = summaryResult[0] || {};

    return {
      statusCode: 200,
      message: 'Berhasil mengambil detail warehouse',
      data: {
        id: warehouse.id,
        name: warehouse.name,
        type: warehouse.type,
        description: warehouse.description,
        is_main: warehouse.type === 'MAIN',
        summary: {
          distinct_product_count: Number(summary.distinct_product_count || 0),
          total_stock_quantity: Number(summary.total_stock_quantity || 0),
          low_stock_count: Number(summary.low_stock_count || 0),
          out_of_stock_count: Number(summary.out_of_stock_count || 0),
        },
        createdAt: warehouse.createdAt,
        updatedAt: warehouse.updatedAt,
      },
    };
  }

  async updateWarehouse(
    userId: string,
    warehouseId: string,
    dto: UpdateWarehouseDto,
  ) {
    const hospitalId = await this.resolveHospitalId(userId);

    const warehouse = await this.db.warehouse.findFirst({
      where: { id: warehouseId, hospital_id: hospitalId },
      select: { id: true, name: true, type: true },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Warehouse tidak ditemukan atau bukan milik rumah sakit Anda',
      );
    }

    if (dto.name && dto.name !== warehouse.name) {
      const duplicateName = await this.db.warehouse.findFirst({
        where: {
          hospital_id: hospitalId,
          name: dto.name,
          id: { not: warehouseId },
        },
        select: { id: true },
      });

      if (duplicateName) {
        throw new ConflictException(
          `Warehouse dengan nama "${dto.name}" sudah terdaftar di rumah sakit ini`,
        );
      }
    }

    if (dto.type === 'MAIN' && warehouse.type !== 'MAIN') {
      const existingMain = await this.db.warehouse.findFirst({
        where: {
          hospital_id: hospitalId,
          type: 'MAIN',
          id: { not: warehouseId },
        },
        select: { id: true, name: true },
      });

      if (existingMain) {
        throw new ConflictException(
          `Gudang Utama sudah terdaftar dengan nama "${existingMain.name}"`,
        );
      }
    }

    // Field-by-field whitelist — jangan pernah menyebar DTO mentah ke Prisma.
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.description !== undefined) data.description = dto.description;

    const updated = await this.db.warehouse.update({
      where: { id: warehouseId },
      data,
    });

    return {
      statusCode: 200,
      message: 'Warehouse berhasil diperbarui',
      data: updated,
    };
  }

  // ─────────────────────────────────────────────
  // 2. Penerimaan Barang (PURCHASE)
  // ─────────────────────────────────────────────

  async createPurchase(userId: string, dto: CreatePurchaseDto) {
    const hospitalId = await this.resolveHospitalId(userId);

    return this.db.$transaction(async (tx: any) => {
      const warehouse = await this.resolveInboundWarehouse(
        tx,
        hospitalId,
        dto.warehouse_id,
      );

      const productMap = await this.loadProductsOrFail(
        tx,
        hospitalId,
        dto.items.map((item) => item.product_id),
      );

      const processedItems: any[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.product_id);

        const expDate = item.exp_date
          ? this.toDate(item.exp_date, 'exp_date')
          : null;

        if (item.batch_number && !expDate) {
          throw new BadRequestException(
            `exp_date wajib diisi untuk produk "${product.name}" apabila nomor batch dicantumkan`,
          );
        }

        // 1. Tambah stok per lokasi
        const stockRow = await tx.warehouseStock.upsert({
          where: {
            product_id_warehouse_id: {
              product_id: product.id,
              warehouse_id: warehouse.id,
            },
          },
          create: {
            product_id: product.id,
            warehouse_id: warehouse.id,
            stock: item.quantity,
            ...(item.min_stock !== undefined && { min_stock: item.min_stock }),
          },
          update: {
            stock: { increment: item.quantity },
            ...(item.min_stock !== undefined && { min_stock: item.min_stock }),
          },
        });

        // 2. Catat batch / kedaluwarsa bila tersedia
        let batchNumber: string | null = null;

        if (item.batch_number || expDate) {
          batchNumber =
            item.batch_number ||
            `BATCH-${new Date()
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, '')}-${product.code}`;

          await tx.stockBatch.upsert({
            where: {
              product_id_warehouse_id_batch_number: {
                product_id: product.id,
                warehouse_id: warehouse.id,
                batch_number: batchNumber,
              },
            },
            create: {
              hospital_id: hospitalId,
              product_id: product.id,
              warehouse_id: warehouse.id,
              batch_number: batchNumber,
              exp_date: expDate as Date,
              buy_price: item.buy_price,
              initial_stock: item.quantity,
              current_stock: item.quantity,
            },
            update: {
              current_stock: { increment: item.quantity },
              initial_stock: { increment: item.quantity },
              ...(expDate && { exp_date: expDate }),
              buy_price: item.buy_price,
            },
          });
        }

        // 3. Tulis baris audit
        await tx.inventoryLogs.create({
          data: {
            hospital_id: hospitalId,
            product_id: product.id,
            warehouse_id: warehouse.id,
            user_id: userId,
            type: 'PURCHASE',
            quantity: item.quantity,
            buy_price: item.buy_price,
            source_destination: dto.supplier_name || null,
            reference_number: dto.reference_number || null,
            notes:
              dto.notes ||
              `Penerimaan barang dari supplier ke ${warehouse.name}`,
          },
        });

        processedItems.push({
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          unit: product.unit,
          quantity_received: item.quantity,
          buy_price: item.buy_price,
          batch_number: batchNumber,
          exp_date: expDate,
          current_stock: stockRow.stock,
        });
      }

      return {
        statusCode: 201,
        message: `Penerimaan barang berhasil dicatat (${processedItems.length} item)`,
        data: {
          warehouse: {
            id: warehouse.id,
            name: warehouse.name,
            type: warehouse.type,
          },
          supplier_name: dto.supplier_name || null,
          reference_number: dto.reference_number || null,
          items: processedItems,
        },
      };
    });
  }

  // ─────────────────────────────────────────────
  // 3. Distribusi & Amprahan (TRANSFER)
  // ─────────────────────────────────────────────

  async createTransfer(userId: string, dto: CreateTransferDto) {
    const hospitalId = await this.resolveHospitalId(userId);

    if (dto.from_warehouse_id === dto.to_warehouse_id) {
      throw new BadRequestException(
        'Warehouse asal dan warehouse tujuan tidak boleh sama',
      );
    }

    return this.db.$transaction(async (tx: any) => {
      const fromWarehouse = await this.findWarehouseOrFail(
        tx,
        hospitalId,
        dto.from_warehouse_id,
      );
      const toWarehouse = await this.findWarehouseOrFail(
        tx,
        hospitalId,
        dto.to_warehouse_id,
      );

      const productMap = await this.loadProductsOrFail(
        tx,
        hospitalId,
        dto.items.map((item) => item.product_id),
      );

      const transferredItems: any[] = [];
      const referenceNumber =
        dto.reference_number ||
        `TRF-${Date.now().toString(36).toUpperCase()}`;

      for (const item of dto.items) {
        const product = productMap.get(item.product_id);

        // 1. Conditional decrement — satu-satunya cara aman tanpa row locking.
        const decrement = await tx.warehouseStock.updateMany({
          where: {
            product_id: product.id,
            warehouse_id: fromWarehouse.id,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (decrement.count === 0) {
          const current = await tx.warehouseStock.findUnique({
            where: {
              product_id_warehouse_id: {
                product_id: product.id,
                warehouse_id: fromWarehouse.id,
              },
            },
            select: { stock: true },
          });

          throw new BadRequestException(
            `Stok "${product.name}" di ${fromWarehouse.name} tidak mencukupi. Tersedia: ${current?.stock ?? 0}, dibutuhkan: ${item.quantity}`,
          );
        }

        // 2. Increment lokasi tujuan
        const destinationStock = await tx.warehouseStock.upsert({
          where: {
            product_id_warehouse_id: {
              product_id: product.id,
              warehouse_id: toWarehouse.id,
            },
          },
          create: {
            product_id: product.id,
            warehouse_id: toWarehouse.id,
            stock: item.quantity,
          },
          update: {
            stock: { increment: item.quantity },
          },
        });

        const sourceStock = await tx.warehouseStock.findUnique({
          where: {
            product_id_warehouse_id: {
              product_id: product.id,
              warehouse_id: fromWarehouse.id,
            },
          },
          select: { stock: true },
        });

        // 3. Ledger: dua baris — keluar dan masuk — dengan nomor referensi sama
        await tx.inventoryLogs.create({
          data: {
            hospital_id: hospitalId,
            product_id: product.id,
            warehouse_id: fromWarehouse.id,
            user_id: userId,
            type: 'TRANSFER_OUT',
            quantity: -item.quantity,
            reference_number: referenceNumber,
            source_destination: toWarehouse.name,
            notes: dto.notes || `Distribusi/amprahan ke ${toWarehouse.name}`,
          },
        });

        await tx.inventoryLogs.create({
          data: {
            hospital_id: hospitalId,
            product_id: product.id,
            warehouse_id: toWarehouse.id,
            user_id: userId,
            type: 'TRANSFER_IN',
            quantity: item.quantity,
            reference_number: referenceNumber,
            source_destination: fromWarehouse.name,
            notes:
              dto.notes || `Penerimaan distribusi dari ${fromWarehouse.name}`,
          },
        });

        transferredItems.push({
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          unit: product.unit,
          quantity_transferred: item.quantity,
          source_remaining_stock: sourceStock?.stock ?? 0,
          destination_current_stock: destinationStock.stock,
          reference_number: referenceNumber,
        });
      }

      return {
        statusCode: 201,
        message: `Transfer stok berhasil diproses (${transferredItems.length} item)`,
        data: {
          from_warehouse: { id: fromWarehouse.id, name: fromWarehouse.name },
          to_warehouse: { id: toWarehouse.id, name: toWarehouse.name },
          reference_number: referenceNumber,
          items: transferredItems,
        },
      };
    });
  }

  // ─────────────────────────────────────────────
  // 4. Monitoring Stok Global (REAL-TIME)
  // ─────────────────────────────────────────────

  async findStocks(userId: string, query: QueryStockDto) {
    const hospitalId = await this.resolveHospitalId(userId);

    const page = this.toPositiveInt(query.page, 1);
    const limit = this.toPositiveInt(query.limit, 20, 200);
    const skip = (page - 1) * limit;

    const warehouseId = query.warehouse_id || null;
    const productId = query.product_id || null;
    const category = query.category || null;
    const search = query.search?.trim() || null;
    const searchLike = search ? `%${search}%` : null;
    const lowOnly = query.low_only === 'true';

    const items: any[] = await this.db.$queryRaw`
      SELECT
        ws."id"                     AS "stock_id",
        ws."stock"                  AS "stock",
        ws."min_stock"              AS "min_stock",
        ws."warehouse_id"           AS "warehouse_id",
        w."name"                    AS "warehouse_name",
        w."type"::text              AS "warehouse_type",
        p."id"                      AS "product_id",
        p."code"                    AS "product_code",
        p."name"                    AS "product_name",
        p."category"::text          AS "product_category",
        p."unit"                    AS "product_unit",
        p."sell_price"              AS "product_sell_price"
      FROM "WarehouseStock" ws
      JOIN "Products" p  ON p."id" = ws."product_id"
      JOIN "Warehouse" w ON w."id" = ws."warehouse_id"
      WHERE w."hospital_id" = ${hospitalId}
        AND (${warehouseId}::text IS NULL OR ws."warehouse_id" = ${warehouseId})
        AND (${productId}::text IS NULL OR ws."product_id" = ${productId})
        AND (${category}::text IS NULL OR p."category"::text = ${category})
        AND (
          ${search}::text IS NULL
          OR p."name" ILIKE ${searchLike}
          OR p."code" ILIKE ${searchLike}
        )
        AND (${lowOnly}::boolean IS NOT TRUE OR ws."stock" <= ws."min_stock")
      ORDER BY p."name" ASC, w."name" ASC
      LIMIT ${limit} OFFSET ${skip};
    `;

    const totalResult: any[] = await this.db.$queryRaw`
      SELECT COUNT(*)::int AS "total"
      FROM "WarehouseStock" ws
      JOIN "Products" p  ON p."id" = ws."product_id"
      JOIN "Warehouse" w ON w."id" = ws."warehouse_id"
      WHERE w."hospital_id" = ${hospitalId}
        AND (${warehouseId}::text IS NULL OR ws."warehouse_id" = ${warehouseId})
        AND (${productId}::text IS NULL OR ws."product_id" = ${productId})
        AND (${category}::text IS NULL OR p."category"::text = ${category})
        AND (
          ${search}::text IS NULL
          OR p."name" ILIKE ${searchLike}
          OR p."code" ILIKE ${searchLike}
        )
        AND (${lowOnly}::boolean IS NOT TRUE OR ws."stock" <= ws."min_stock");
    `;

    const summaryResult: any[] = await this.db.$queryRaw`
      SELECT
        COUNT(*)::int AS "total_stock_rows",
        COALESCE(SUM(ws."stock"), 0)::int AS "total_stock_quantity",
        COUNT(*) FILTER (WHERE ws."stock" <= ws."min_stock")::int AS "total_low_stock",
        COUNT(*) FILTER (WHERE ws."stock" = 0)::int AS "total_out_of_stock"
      FROM "WarehouseStock" ws
      JOIN "Products" p  ON p."id" = ws."product_id"
      JOIN "Warehouse" w ON w."id" = ws."warehouse_id"
      WHERE w."hospital_id" = ${hospitalId};
    `;

    const total = Number(totalResult[0]?.total || 0);
    const summary = summaryResult[0] || {};

    const data = items.map((row: any) => ({
      stock_id: row.stock_id,
      product: {
        id: row.product_id,
        code: row.product_code,
        name: row.product_name,
        category: row.product_category,
        unit: row.product_unit,
        sell_price: row.product_sell_price,
      },
      warehouse: {
        id: row.warehouse_id,
        name: row.warehouse_name,
        type: row.warehouse_type,
      },
      stock: row.stock,
      min_stock: row.min_stock,
      status:
        row.stock === 0
          ? 'OUT_OF_STOCK'
          : row.stock <= row.min_stock
            ? 'LOW_STOCK'
            : 'AVAILABLE',
      is_low_stock: row.stock <= row.min_stock,
      is_out_of_stock: row.stock === 0,
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil data stok real-time',
      data,
      summary: {
        total_stock_rows: Number(summary.total_stock_rows || 0),
        total_stock_quantity: Number(summary.total_stock_quantity || 0),
        total_low_stock: Number(summary.total_low_stock || 0),
        total_out_of_stock: Number(summary.total_out_of_stock || 0),
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mengatur ambang minimum stok per produk per lokasi.
   */
  async updateMinStock(userId: string, dto: UpdateMinStockDto) {
    const hospitalId = await this.resolveHospitalId(userId);

    const warehouse = await this.findWarehouseOrFail(
      this.db,
      hospitalId,
      dto.warehouse_id,
    );

    const product = await this.db.products.findFirst({
      where: { id: dto.product_id, hospital_id: hospitalId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException(
        'Produk tidak ditemukan atau bukan milik rumah sakit Anda',
      );
    }

    const updated = await this.db.warehouseStock.upsert({
      where: {
        product_id_warehouse_id: {
          product_id: product.id,
          warehouse_id: warehouse.id,
        },
      },
      create: {
        product_id: product.id,
        warehouse_id: warehouse.id,
        stock: 0,
        min_stock: dto.min_stock,
      },
      update: {
        min_stock: dto.min_stock,
      },
    });

    return {
      statusCode: 200,
      message: `Minimum stok "${product.name}" di ${warehouse.name} berhasil diatur ke ${dto.min_stock}`,
      data: {
        product_id: product.id,
        warehouse_id: warehouse.id,
        stock: updated.stock,
        min_stock: updated.min_stock,
      },
    };
  }

  // ─────────────────────────────────────────────
  // 5. Audit Trail (INVENTORY LOGS)
  // ─────────────────────────────────────────────

  async findInventoryLogs(userId: string, query: QueryInventoryLogDto) {
    const hospitalId = await this.resolveHospitalId(userId);

    const page = this.toPositiveInt(query.page, 1);
    const limit = this.toPositiveInt(query.limit, 20, 200);
    const skip = (page - 1) * limit;

    const where: any = { hospital_id: hospitalId };

    if (query.type) where.type = query.type;
    if (query.product_id) where.product_id = query.product_id;
    if (query.warehouse_id) where.warehouse_id = query.warehouse_id;

    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) {
        where.createdAt.gte = this.toDate(query.date_from, 'date_from');
      }
      if (query.date_to) {
        const endOfDay = this.toDate(query.date_to, 'date_to');
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { reference_number: { contains: search, mode: 'insensitive' } },
        { source_destination: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.db.inventoryLogs.count({ where }),
      this.db.inventoryLogs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              unit: true,
              category: true,
            },
          },
          warehouse: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    const data = logs.map((log: any) => ({
      id: log.id,
      type: log.type,
      quantity: log.quantity,
      direction: log.quantity > 0 ? 'IN' : log.quantity < 0 ? 'OUT' : 'NEUTRAL',
      buy_price: log.buy_price,
      source_destination: log.source_destination,
      reference_number: log.reference_number,
      notes: log.notes,
      product: log.product
        ? {
            id: log.product.id,
            code: log.product.code,
            name: log.product.name,
            unit: log.product.unit,
            category: log.product.category,
          }
        : null,
      warehouse: log.warehouse
        ? {
            id: log.warehouse.id,
            name: log.warehouse.name,
            type: log.warehouse.type,
          }
        : null,
      recorded_by: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            role: log.user.role,
          }
        : null,
      createdAt: log.createdAt,
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil riwayat mutasi stok',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ─────────────────────────────────────────────
  // 6. Stock Adjustment / Opname
  // ─────────────────────────────────────────────

  async createAdjustment(userId: string, dto: CreateAdjustmentDto) {
    const hospitalId = await this.resolveHospitalId(userId);

    return this.db.$transaction(async (tx: any) => {
      const productMap = await this.loadProductsOrFail(
        tx,
        hospitalId,
        dto.items.map((item) => item.product_id),
      );

      // Validasi seluruh warehouse lebih dulu agar id yang salah gagal sebelum ada penulisan
      const warehouseIds = [
        ...new Set(dto.items.map((item) => item.warehouse_id)),
      ];
      const warehouses = await tx.warehouse.findMany({
        where: { id: { in: warehouseIds }, hospital_id: hospitalId },
        select: { id: true, name: true },
      });

      if (warehouses.length !== warehouseIds.length) {
        throw new NotFoundException(
          'Terdapat warehouse yang tidak ditemukan atau bukan milik rumah sakit Anda',
        );
      }

      const warehouseMap = new Map<string, any>(
        warehouses.map((w: any) => [w.id, w]),
      );

      const adjustedItems: any[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.product_id);
        const warehouse = warehouseMap.get(item.warehouse_id);

        const existing = await tx.warehouseStock.findUnique({
          where: {
            product_id_warehouse_id: {
              product_id: product.id,
              warehouse_id: warehouse.id,
            },
          },
          select: { stock: true },
        });

        const previousStock = existing?.stock ?? 0;
        const delta = item.new_stock - previousStock;

        if (delta === 0) {
          adjustedItems.push({
            product_id: product.id,
            product_code: product.code,
            product_name: product.name,
            warehouse_id: warehouse.id,
            warehouse_name: warehouse.name,
            previous_stock: previousStock,
            new_stock: item.new_stock,
            delta: 0,
            skipped: true,
            note: 'Stok sistem sudah sesuai dengan hasil opname',
          });
          continue;
        }

        await tx.warehouseStock.upsert({
          where: {
            product_id_warehouse_id: {
              product_id: product.id,
              warehouse_id: warehouse.id,
            },
          },
          create: {
            product_id: product.id,
            warehouse_id: warehouse.id,
            stock: item.new_stock,
          },
          update: {
            stock: item.new_stock,
          },
        });

        await tx.inventoryLogs.create({
          data: {
            hospital_id: hospitalId,
            product_id: product.id,
            warehouse_id: warehouse.id,
            user_id: userId,
            type: 'ADJUSTMENT',
            quantity: delta,
            reference_number: dto.reference_number || null,
            source_destination: null,
            notes:
              item.reason ||
              dto.notes ||
              `Penyesuaian stok opname: ${previousStock} -> ${item.new_stock}`,
          },
        });

        adjustedItems.push({
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          warehouse_id: warehouse.id,
          warehouse_name: warehouse.name,
          previous_stock: previousStock,
          new_stock: item.new_stock,
          delta,
          skipped: false,
        });
      }

      const changedCount = adjustedItems.filter((i) => !i.skipped).length;

      return {
        statusCode: 200,
        message: `Penyesuaian stok berhasil dicatat (${changedCount} item disesuaikan)`,
        data: {
          reference_number: dto.reference_number || null,
          items: adjustedItems,
        },
      };
    });
  }
}
