import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WarehouseType } from '../../../../generated/prisma/enums.js';

export class QueryWarehouseDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsEnum(WarehouseType, {
    message:
      'Tipe warehouse harus salah satu dari: MAIN, PHARMACY, LABORATORY, POLI, IGD, OTHER',
  })
  type?: WarehouseType;

  @IsOptional()
  @IsString({ message: 'Page harus berupa angka' })
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString({ message: 'Limit harus berupa angka' })
  @MaxLength(10)
  limit?: string;
}
