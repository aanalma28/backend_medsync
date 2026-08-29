import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Category } from '../../../../generated/prisma/enums.js';

/**
 * DTO for updating existing product master details and prices.
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'Nama produk harus berupa string' })
  name?: string;

  @IsOptional()
  @IsEnum(Category, { message: 'Kategori tidak valid' })
  category?: Category;

  @IsOptional()
  @IsString({ message: 'Satuan harus berupa string' })
  unit?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Minimum stok harus berupa angka' })
  @Min(0, { message: 'Minimum stok tidak boleh negatif' })
  min_stock?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Harga beli harus berupa angka' })
  @Min(0, { message: 'Harga beli tidak boleh negatif' })
  buy_price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Harga jual harus berupa angka' })
  @Min(0, { message: 'Harga jual tidak boleh negatif' })
  sell_price?: number;

  @IsOptional()
  @IsString({ message: 'Deskripsi harus berupa string' })
  description?: string;
}
