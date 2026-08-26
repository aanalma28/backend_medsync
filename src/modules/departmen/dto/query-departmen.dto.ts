import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDepartmenDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page harus berupa angka bulat' })
  @Min(1, { message: 'Page minimal bernilai 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal bernilai 1' })
  limit?: number = 10;
}
