import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { RestockProductDto } from './dto/restock-product.dto.js';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto.js';
import { Category } from '../../../generated/prisma/enums.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  /**
   * Helper to resolve Pharmacist / Employee ID from User ID.
   */
  private async resolveEmployeeId(userId: string): Promise<string | null> {
    const employee = await this.db.employee.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    return employee?.id || null;
  }

  // ─────────────────────────────────────────────
  // 1. Catalog & Master Data Products
  // ─────────────────────────────────────────────

  /**
   * Get all products with search, category filtering, stock status filters, and pagination.
   */
  async findAllProducts(queryDto: QueryProductDto) {
    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search filter (code or name)
    if (queryDto.search && queryDto.search.trim() !== '') {
      const search = queryDto.search.trim();
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (queryDto.category) {
      where.category = queryDto.category;
    }

    // Stock status filter
    if (queryDto.stock_status) {
      const status = queryDto.stock_status.toUpperCase();
      if (status === 'LOW') {
        where.stock = { lte: 10 };
      } else if (status === 'OUT') {
        where.stock = 0;
      }
    }

    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    const [total, items, lowStockCount, outOfStockCount] = await Promise.all([
      this.db.products.count({ where }),
      this.db.products.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          inventoryLogs: {
            where: { exp_date: { not: null } },
            orderBy: { exp_date: 'asc' },
            take: 1,
            select: {
              exp_date: true,
              supplierName: true,
            },
          },
        },
      }),
      this.db.products.count({
        where: {
          stock: { lte: 10 },
        },
      }),
      this.db.products.count({
        where: { stock: 0 },
      }),
    ]);

    // Format products response with status indicators
    const formattedProducts = items.map((product: any) => {
      const isLowStock = product.stock <= product.min_stock;
      const isOutOfStock = product.stock === 0;

      let status = 'AVAILABLE';
      if (isOutOfStock) {
        status = 'OUT_OF_STOCK';
      } else if (isLowStock) {
        status = 'LOW_STOCK';
      }

      const latestLog = product.inventoryLogs?.[0];
      const expDate = latestLog?.exp_date ? new Date(latestLog.exp_date) : null;
      const isNearExpiry = expDate ? expDate <= ninetyDaysFromNow && expDate >= today : false;

      return {
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category,
        unit: product.unit,
        stock: product.stock,
        min_stock: product.min_stock,
        buy_price: product.buy_price,
        sell_price: product.sell_price,
        description: product.description,
        status,
        is_low_stock: isLowStock,
        is_out_of_stock: isOutOfStock,
        is_near_expiry: isNearExpiry,
        exp_date: expDate,
        supplierName: latestLog?.supplierName || null,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    return {
      statusCode: 200,
      message: 'Berhasil mengambil daftar katalog produk',
      data: formattedProducts,
      summary: {
        total_products: total,
        total_low_stock: lowStockCount,
        total_out_of_stock: outOfStockCount,
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
   * Get single product detail by ID with inventory logs history.
   */
  async findProductById(id: string) {
    const product = await this.db.products.findUnique({
      where: { id },
      include: {
        inventoryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
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
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const isLowStock = product.stock <= product.min_stock;
    const isOutOfStock = product.stock === 0;

    return {
      statusCode: 200,
      message: 'Berhasil mengambil detail produk',
      data: {
        ...product,
        status: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'AVAILABLE',
        is_low_stock: isLowStock,
        is_out_of_stock: isOutOfStock,
      },
    };
  }

  /**
   * Add a new product to master catalog.
   */
  async createProduct(userId: string, createDto: CreateProductDto) {
    const existingCode = await this.db.products.findUnique({
      where: { code: createDto.code },
    });

    if (existingCode) {
      throw new ConflictException(`Kode produk/SKU "${createDto.code}" sudah terdaftar.`);
    }

    return this.db.$transaction(async (tx: any) => {
      const product = await tx.products.create({
        data: {
          code: createDto.code.toUpperCase(),
          name: createDto.name,
          category: createDto.category,
          unit: createDto.unit,
          stock: Number(createDto.stock),
          min_stock: Number(createDto.min_stock),
          buy_price: Number(createDto.buy_price),
          sell_price: Number(createDto.sell_price),
          description: createDto.description || '',
        },
      });

      // If initial stock > 0, log initial inventory
      if (Number(createDto.stock) > 0) {
        await tx.inventoryLogs.create({
          data: {
            product_id: product.id,
            type: 'INITIAL',
            quantity: Number(createDto.stock),
            buy_price: Number(createDto.buy_price),
            user_id: userId,
            notes: 'Stok awal pembuatan produk baru',
          },
        });
      }

      return {
        statusCode: 201,
        message: 'Produk baru berhasil ditambahkan',
        data: product,
      };
    });
  }

  /**
   * Update product information and prices.
   */
  async updateProduct(id: string, updateDto: UpdateProductDto) {
    const existing = await this.db.products.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const updated = await this.db.products.update({
      where: { id },
      data: {
        ...(updateDto.name !== undefined && { name: updateDto.name }),
        ...(updateDto.category !== undefined && { category: updateDto.category }),
        ...(updateDto.unit !== undefined && { unit: updateDto.unit }),
        ...(updateDto.min_stock !== undefined && { min_stock: Number(updateDto.min_stock) }),
        ...(updateDto.buy_price !== undefined && { buy_price: Number(updateDto.buy_price) }),
        ...(updateDto.sell_price !== undefined && { sell_price: Number(updateDto.sell_price) }),
        ...(updateDto.description !== undefined && { description: updateDto.description }),
      },
    });

    return {
      statusCode: 200,
      message: 'Data produk berhasil diperbarui',
      data: updated,
    };
  }

  // ─────────────────────────────────────────────
  // 2. Restock / Stock-In
  // ─────────────────────────────────────────────

  /**
   * Restock product (Stock-In) and record inventory log.
   */
  async restockProduct(userId: string, productId: string, dto: RestockProductDto) {
    const product = await this.db.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    // Validation: Expired Date mandatory for DRUG and MEDICAL_DEVICE
    if (
      (product.category === 'DRUG' || product.category === 'MEDICAL_DEVICE') &&
      !dto.exp_date
    ) {
      throw new BadRequestException(
        `Tanggal kedaluwarsa (exp_date) wajib diisi untuk produk kategori ${product.category === 'DRUG' ? 'Obat' : 'Alat Medis'}`,
      );
    }

    return this.db.$transaction(async (tx: any) => {
      const updatedProduct = await tx.products.update({
        where: { id: productId },
        data: {
          stock: { increment: Number(dto.quantity) },
          ...(dto.buy_price !== undefined && { buy_price: Number(dto.buy_price) }),
        },
      });

      const expDate = dto.exp_date ? new Date(dto.exp_date) : null;

      const log = await tx.inventoryLogs.create({
        data: {
          product_id: productId,
          type: 'RESTOCK',
          quantity: Number(dto.quantity),
          buy_price: dto.buy_price ? Number(dto.buy_price) : product.buy_price,
          exp_date: expDate,
          supplierName: dto.supplierName || null,
          reference_number: dto.reference_number || null,
          user_id: userId,
          notes: dto.notes || `Restock masuk +${dto.quantity} ${product.unit}`,
        },
      });

      return {
        statusCode: 200,
        message: `Berhasil menambah stok produk ${product.name} sebanyak +${dto.quantity} ${product.unit}`,
        data: {
          product: updatedProduct,
          log,
        },
      };
    });
  }

  // ─────────────────────────────────────────────
  // 3. Smart Alerts (Low Stock & Near Expiry)
  // ─────────────────────────────────────────────

  /**
   * Get products with low stock or approaching expiration date.
   */
  async getAlerts() {
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    const [allProducts, recentLogs] = await Promise.all([
      this.db.products.findMany({
        orderBy: { stock: 'asc' },
      }),
      this.db.inventoryLogs.findMany({
        where: {
          exp_date: {
            not: null,
            lte: ninetyDaysFromNow,
          },
        },
        include: {
          product: true,
        },
        orderBy: { exp_date: 'asc' },
      }),
    ]);

    const lowStockProducts = allProducts
      .filter((p: any) => p.stock <= p.min_stock)
      .map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        unit: p.unit,
        stock: p.stock,
        min_stock: p.min_stock,
        is_out_of_stock: p.stock === 0,
      }));

    const nearExpiryProducts = recentLogs.map((log: any) => {
      const expDate = new Date(log.exp_date);
      const isExpired = expDate < today;
      return {
        log_id: log.id,
        product_id: log.product.id,
        code: log.product.code,
        name: log.product.name,
        category: log.product.category,
        exp_date: log.exp_date,
        supplierName: log.supplierName,
        is_expired: isExpired,
      };
    });

    return {
      statusCode: 200,
      message: 'Berhasil mengambil data peringatan stok dan kedaluwarsa',
      data: {
        low_stock_count: lowStockProducts.length,
        near_expiry_count: nearExpiryProducts.length,
        low_stock_items: lowStockProducts,
        near_expiry_items: nearExpiryProducts,
      },
    };
  }

  // ─────────────────────────────────────────────
  // 4. Prescription Fulfillment & Automatic Stock Deduction
  // ─────────────────────────────────────────────

  /**
   * Fetch pending doctor prescriptions waiting to be dispensed by Apoteker.
   */
  async findPendingPrescriptions() {
    const recipes = await this.db.doctorRecipe.findMany({
      where: {
        status: { in: ['PENDING', 'MENUNGGU'] },
      },
      orderBy: { recipe_date_exec: 'asc' },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                birth_date: true,
              },
            },
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        recipeDetails: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                unit: true,
                stock: true,
                min_stock: true,
                sell_price: true,
              },
            },
          },
        },
      },
    });

    const formattedData = recipes.map((recipe: any) => {
      let isAllStockAvailable = true;

      const items = recipe.recipeDetails.map((detail: any) => {
        const requiredQty = 1;
        const hasEnoughStock = detail.product?.stock >= requiredQty;
        if (!hasEnoughStock) {
          isAllStockAvailable = false;
        }

        return {
          detail_id: detail.id,
          product: detail.product
            ? {
                id: detail.product.id,
                code: detail.product.code,
                name: detail.product.name,
                category: detail.product.category,
                unit: detail.product.unit,
                current_stock: detail.product.stock,
                sell_price: detail.product.sell_price,
              }
            : null,
          rules_using: detail.rules_using,
          required_quantity: requiredQty,
          has_enough_stock: hasEnoughStock,
        };
      });

      return {
        id: recipe.id,
        no_trx: recipe.no_trx,
        recipe_date_exec: recipe.recipe_date_exec,
        status: recipe.status,
        patient: {
          id: recipe.patient?.id,
          medical_record_number: recipe.patient?.medical_record_number,
          name: recipe.patient?.user?.name,
          phone: recipe.patient?.user?.phone,
          birth_date: recipe.patient?.user?.birth_date,
        },
        doctor: {
          id: recipe.doctor?.id,
          name: recipe.doctor?.user?.name,
          staff_code: recipe.doctor?.staff_code,
        },
        is_ready_to_dispense: isAllStockAvailable,
        items,
      };
    });

    return {
      statusCode: 200,
      message: 'Berhasil mengambil daftar resep pending untuk disiapkan',
      data: formattedData,
    };
  }

  /**
   * Process prescription fulfillment, reduce product inventory automatically, and complete recipe status.
   */
  async dispensePrescription(userId: string, recipeId: string, dto: DispensePrescriptionDto) {
    const employeeId = await this.resolveEmployeeId(userId);

    return this.db.$transaction(async (tx: any) => {
      const recipe = await tx.doctorRecipe.findUnique({
        where: { id: recipeId },
        include: {
          patient: {
            include: {
              user: { select: { name: true } },
            },
          },
          recipeDetails: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!recipe) {
        throw new NotFoundException('Data resep dokter tidak ditemukan');
      }

      if (recipe.status === 'COMPLETED' || recipe.status === 'SELESAI') {
        throw new BadRequestException('Resep ini sudah selesai ditebus sebelumnya');
      }

      // Map item dispense quantities
      const itemQtyMap = new Map<string, number>();
      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          itemQtyMap.set(item.product_id, item.quantity);
        }
      }

      // Step 1: Stock Validation for all items in recipe
      for (const detail of recipe.recipeDetails) {
        const product = detail.product;
        if (!product) {
          throw new BadRequestException(`Produk obat dengan ID ${detail.product_id} tidak ditemukan`);
        }
        const qtyToDeduct = itemQtyMap.get(product.id) || 1;

        if (product.stock < qtyToDeduct) {
          throw new BadRequestException(
            `Stok produk "${product.name}" (${product.code}) tidak mencukupi! Stok saat ini: ${product.stock}, dibutuhkan: ${qtyToDeduct}`,
          );
        }
      }

      // Step 2: Deduct stock & create InventoryLogs for each item
      const dispensedItems: any[] = [];
      for (const detail of recipe.recipeDetails) {
        const product = detail.product;
        const qtyToDeduct = itemQtyMap.get(product.id) || 1;

        const updatedProduct = await tx.products.update({
          where: { id: product.id },
          data: {
            stock: { decrement: qtyToDeduct },
          },
        });

        await tx.inventoryLogs.create({
          data: {
            product_id: product.id,
            type: 'DISPENSE',
            quantity: -qtyToDeduct,
            buy_price: product.buy_price,
            user_id: userId,
            notes: `Pemotongan resep no. ${recipe.no_trx} untuk pasien ${recipe.patient?.user?.name || ''}`,
          },
        });

        dispensedItems.push({
          product_id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          deducted_quantity: qtyToDeduct,
          remaining_stock: updatedProduct.stock,
        });
      }

      // Step 3: Update Recipe Status to COMPLETED
      const updatedRecipe = await tx.doctorRecipe.update({
        where: { id: recipeId },
        data: {
          status: 'COMPLETED',
          ...(employeeId && { pharmacist_id: employeeId }),
          take_med_date: new Date(),
          verify_notes: dto.verify_notes || 'Ditebus dan diserahkan oleh apoteker',
          match_product_recipe: dto.match_product_recipe ?? true,
        },
      });

      return {
        statusCode: 200,
        message: `Resep ${recipe.no_trx} berhasil ditebus dan stok telah dikurangi otomatis`,
        data: {
          recipe: {
            id: updatedRecipe.id,
            no_trx: updatedRecipe.no_trx,
            status: updatedRecipe.status,
            take_med_date: updatedRecipe.take_med_date,
            verify_notes: updatedRecipe.verify_notes,
          },
          dispensed_items: dispensedItems,
        },
      };
    });
  }
}
