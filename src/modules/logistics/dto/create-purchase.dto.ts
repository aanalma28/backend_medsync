import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PurchaseItemDto {
  @IsString({ message: 'Product ID harus berupa string' })
  @IsNotEmpty({ message: 'Product ID tidak boleh kosong' })
  product_id: string;

  @IsNumber({}, { message: 'Jumlah harus berupa angka' })
  @Min(1, { message: 'Jumlah minimal 1' })
  quantity: number;

  @IsNumber({}, { message: 'Harga beli harus berupa angka' })
  @Min(0, { message: 'Harga beli minimal 0' })
  buy_price: number;

  @IsOptional()
  @IsString({ message: 'Nomor batch harus berupa string' })
  @MaxLength(100, { message: 'Nomor batch maksimal 100 karakter' })
  batch_number?: string;

  @IsOptional()
  @IsString({
    message: 'Tanggal kedaluwarsa harus berupa string tanggal YYYY-MM-DD',
  })
  exp_date?: string;

  /**
   * Opsional: ambang minimum stok untuk produk ini di warehouse tujuan.
   * Bila diisi, WarehouseStock.min_stock akan diperbarui.
   */
  @IsOptional()
  @IsInt({ message: 'Minimum stok harus berupa angka bulat' })
  @Min(0, { message: 'Minimum stok minimal 0' })
  min_stock?: number;
}

export class CreatePurchaseDto {
  /**
   * Opsional. Bila dikosongkan, barang masuk ke Gudang Utama (type = MAIN)
   * milik rumah sakit pemanggil.
   */
  @IsOptional()
  @IsString({ message: 'Warehouse ID harus berupa string' })
  warehouse_id?: string;

  @IsOptional()
  @IsString({ message: 'Nama supplier harus berupa string' })
  @MaxLength(150, { message: 'Nama supplier maksimal 150 karakter' })
  supplier_name?: string;

  @IsOptional()
  @IsString({ message: 'Nomor referensi harus berupa string' })
  @MaxLength(100, { message: 'Nomor referensi maksimal 100 karakter' })
  reference_number?: string;

  @IsOptional()
  @IsString({ message: 'Catatan harus berupa string' })
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;

  @IsArray({ message: 'Items harus berupa array' })
  @ArrayMinSize(1, { message: 'Minimal 1 item harus dicatat' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
