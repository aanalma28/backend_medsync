import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WarehouseType } from '../../../../generated/prisma/enums.js';

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString({ message: 'Nama warehouse harus berupa string' })
  @MinLength(2, { message: 'Nama warehouse minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama warehouse maksimal 100 karakter' })
  name?: string;

  @IsOptional()
  @IsEnum(WarehouseType, {
    message:
      'Tipe warehouse harus salah satu dari: MAIN, PHARMACY, LABORATORY, POLI, IGD, OTHER',
  })
  type?: WarehouseType;

  @IsOptional()
  @IsString({ message: 'Deskripsi harus berupa string' })
  @MaxLength(500, { message: 'Deskripsi maksimal 500 karakter' })
  description?: string;
}
