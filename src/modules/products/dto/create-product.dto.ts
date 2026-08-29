import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Category } from '../../../../generated/prisma/enums.js';

export class CreateProductDto {
  @IsNotEmpty({ message: 'Kode produk wajib diisi' })
  @IsString({ message: 'Kode produk harus berupa string' })
  code: string;

  @IsNotEmpty({ message: 'Nama produk wajib diisi' })
  @IsString({ message: 'Nama produk harus berupa string' })
  name: string;

  @IsNotEmpty({ message: 'Kategori produk wajib diisi' })
  @IsEnum(Category, { message: 'Kategori tidak valid' })
  category: Category;

  @IsNotEmpty({ message: 'Satuan produk wajib diisi' })
  @IsString({ message: 'Satuan harus berupa string' })
  unit: string;

  @IsNotEmpty({ message: 'Stok awal wajib diisi' })
  @IsNumber({}, { message: 'Stok harus berupa angka' })
  @Min(0, { message: 'Stok minimal 0' })
  stock: number;

  @IsNotEmpty({ message: 'Stok minimum wajib diisi' })
  @IsNumber({}, { message: 'Stok minimum harus berupa angka' })
  @Min(0, { message: 'Stok minimum minimal 0' })
  min_stock: number;

  @IsNotEmpty({ message: 'Harga beli wajib diisi' })
  @IsNumber({}, { message: 'Harga beli harus berupa angka' })
  @Min(0, { message: 'Harga beli minimal 0' })
  buy_price: number;

  @IsNotEmpty({ message: 'Harga jual wajib diisi' })
  @IsNumber({}, { message: 'Harga jual harus berupa angka' })
  @Min(0, { message: 'Harga jual minimal 0' })
  sell_price: number;

  @IsOptional()
  @IsString({ message: 'Deskripsi harus berupa string' })
  description?: string;
}
