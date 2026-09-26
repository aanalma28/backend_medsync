import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TransferItemDto {
  @IsString({ message: 'Product ID harus berupa string' })
  @IsNotEmpty({ message: 'Product ID tidak boleh kosong' })
  product_id: string;

  @IsNumber({}, { message: 'Jumlah harus berupa angka' })
  @Min(1, { message: 'Jumlah minimal 1' })
  quantity: number;
}

export class CreateTransferDto {
  @IsString({ message: 'Warehouse asal harus berupa string' })
  @IsNotEmpty({ message: 'Warehouse asal tidak boleh kosong' })
  from_warehouse_id: string;

  @IsString({ message: 'Warehouse tujuan harus berupa string' })
  @IsNotEmpty({ message: 'Warehouse tujuan tidak boleh kosong' })
  to_warehouse_id: string;

  @IsOptional()
  @IsString({ message: 'Nomor referensi / amprahan harus berupa string' })
  @MaxLength(100, { message: 'Nomor referensi maksimal 100 karakter' })
  reference_number?: string;

  @IsOptional()
  @IsString({ message: 'Catatan harus berupa string' })
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string;

  @IsArray({ message: 'Items harus berupa array' })
  @ArrayMinSize(1, { message: 'Minimal 1 item harus ditransfer' })
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}
