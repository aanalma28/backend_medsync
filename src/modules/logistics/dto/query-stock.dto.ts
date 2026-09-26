import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Category } from '../../../../generated/prisma/enums.js';

export class QueryStockDto {
  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsEnum(Category, {
    message:
      'Kategori harus salah satu dari: DRUG, CONSUMABLE, SUPPLEMENT, MEDICAL_DEVICE, OTHER',
  })
  category?: Category;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  /**
   * String, bukan boolean: dengan enableImplicitConversion, Boolean('false')
   * bernilai true sehingga `?low_only=false` akan salah diartikan.
   */
  @IsOptional()
  @IsIn(['true', 'false'], {
    message: 'low_only harus bernilai true atau false',
  })
  low_only?: string;

  @IsOptional()
  @IsString({ message: 'Page harus berupa angka' })
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString({ message: 'Limit harus berupa angka' })
  @MaxLength(10)
  limit?: string;
}
