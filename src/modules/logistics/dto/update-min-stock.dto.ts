import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/**
 * Mengatur ambang minimum stok per produk per lokasi.
 *
 * Sebelumnya `WarehouseStock.min_stock` selalu bernilai default schema (5) dan
 * TIDAK ADA endpoint yang dapat mengubahnya, sehingga `?low_only=true` dan
 * seluruh hitungan low-stock di modul Logistik tidak bermakna.
 */
export class UpdateMinStockDto {
  @IsString({ message: 'Product ID harus berupa string' })
  @IsNotEmpty({ message: 'Product ID tidak boleh kosong' })
  product_id: string;

  @IsString({ message: 'Warehouse ID harus berupa string' })
  @IsNotEmpty({ message: 'Warehouse ID tidak boleh kosong' })
  warehouse_id: string;

  @IsInt({ message: 'Minimum stok harus berupa angka bulat' })
  @Min(0, { message: 'Minimum stok minimal 0' })
  min_stock: number;
}
