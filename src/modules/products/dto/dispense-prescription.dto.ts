import { IsOptional, IsString, IsBoolean, IsArray, ValidateNested, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class DispenseItemDto {
  @IsNotEmpty({ message: 'product_id wajib diisi' })
  @IsString({ message: 'product_id harus berupa string' })
  product_id: string;

  @IsNotEmpty({ message: 'quantity wajib diisi' })
  @IsNumber({}, { message: 'quantity harus berupa angka' })
  @Min(1, { message: 'quantity minimal 1' })
  quantity: number;
}

/**
 * DTO for processing and dispensing doctor prescriptions.
 */
export class DispensePrescriptionDto {
  @IsOptional()
  @IsString({ message: 'Catatan verifikasi harus berupa string' })
  verify_notes?: string;

  @IsOptional()
  @IsBoolean({ message: 'match_product_recipe harus berupa boolean' })
  match_product_recipe?: boolean;

  @IsOptional()
  @IsArray({ message: 'items harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => DispenseItemDto)
  items?: DispenseItemDto[];
}
