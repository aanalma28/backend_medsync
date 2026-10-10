import { IsOptional, IsString } from 'class-validator';

/**
 * Query filter untuk endpoint GET /logistics/stock-batches.
 *
 * Semua field bertipe string karena nilai datang dari query string
 * (contoh: `?page=1&limit=20&status=near_expiry`). Normalisasi angka dan
 * tanggal dilakukan di LogisticsService (`toPositiveInt` / `toDate`),
 * bukan di DTO — konsisten dengan QueryStockDto dan QueryInventoryLogDto.
 *
 * `status` sengaja TIDAK memakai @IsIn agar pengirim boleh memakai huruf
 * kecil (mis. "near_expiry"). Service akan meng-uppercase nilainya dan
 * mengabaikan nilai yang tidak dikenali.
 */
export class QueryStockBatchDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Salah satu dari: AVAILABLE | NEAR_EXPIRY | EXPIRED | OUT_OF_STOCK.
   */
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  exp_date_from?: string;

  @IsOptional()
  @IsString()
  exp_date_to?: string;
}
