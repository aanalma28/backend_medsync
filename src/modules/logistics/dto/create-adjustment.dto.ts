import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AdjustmentItemDto {
  @IsString({ message: 'Product ID harus berupa string' })
  @IsNotEmpty({ message: 'Product ID tidak boleh kosong' })
  product_id: string;

  @IsString({ message: 'Warehouse ID harus berupa string' })
  @IsNotEmpty({ message: 'Warehouse ID tidak boleh kosong' })
  warehouse_id: string;

  /**
   * Jumlah fisik hasil opname (nilai absolut, bukan selisih).
   * Selisih terhadap stok sistem dihitung otomatis oleh service.
   */
  @IsInt({ message: 'Stok fisik harus berupa angka bulat' })
  @Min(0, { message: 'Stok fisik minimal 0' })
  new_stock: number;

  @IsOptional()
  @IsString({ message: 'Alasan penyesuaian harus berupa string' })
  @MaxLength(300, { message: 'Alasan penyesuaian maksimal 300 karakter' })
  reason?: string;
}

export class CreateAdjustmentDto {
  @IsOptional()
  @IsString({ message: 'Nomor referensi harus berupa string' })
  @MaxLength(100, { message: 'Nomor referensi maksimal 100 karakter' })
  reference_number?: string;

  @IsOptional()
  @IsString({ message: 'Catatan harus berupa string' })
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;

  @IsArray({ message: 'Items harus berupa array' })
  @ArrayMinSize(1, { message: 'Minimal 1 item harus disesuaikan' })
  @ValidateNested({ each: true })
  @Type(() => AdjustmentItemDto)
  items: AdjustmentItemDto[];
}
