import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InventoryLogType } from '../../../../generated/prisma/enums.js';

export class QueryInventoryLogDto {
  @IsOptional()
  @IsEnum(InventoryLogType, {
    message:
      'Tipe mutasi tidak valid (INITIAL, PURCHASE, RESTOCK, TRANSFER_OUT, TRANSFER_IN, DISPENSE, USAGE, ADJUSTMENT, RETURN)',
  })
  type?: InventoryLogType;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString({
    message: 'Tanggal awal harus berupa string tanggal YYYY-MM-DD',
  })
  date_from?: string;

  @IsOptional()
  @IsString({
    message: 'Tanggal akhir harus berupa string tanggal YYYY-MM-DD',
  })
  date_to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsString({ message: 'Page harus berupa angka' })
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString({ message: 'Limit harus berupa angka' })
  @MaxLength(10)
  limit?: string;
}
