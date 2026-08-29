import { IsOptional, IsInt, IsString, IsEnum, Min } from 'class-validator';
import { Category } from '../../../../generated/prisma/enums.js';

/**
 * DTO for querying products list with filters and search.
 */
export class QueryProductDto {
  @IsOptional()
  @IsInt({ message: 'Page harus berupa angka bulat' })
  @Min(1, { message: 'Page minimal 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'Pencarian harus berupa string' })
  search?: string;

  @IsOptional()
  @IsEnum(Category, { message: 'Kategori tidak valid' })
  category?: Category;

  @IsOptional()
  @IsString({ message: 'Status stok harus berupa string (LOW, NORMAL, OUT, ALL)' })
  stock_status?: string;
}
