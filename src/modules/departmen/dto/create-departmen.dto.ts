import { IsString, IsNotEmpty, MinLength, MaxLength, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { CategoryDepartmen } from '../../../../generated/prisma/enums.js';

/**
 * CATATAN: `category` WAJIB ada di DTO ini.
 *
 * DepartmenService.create() sudah menulis `createDto.category` (dengan default
 * GENERALIST), tetapi DTO ini sebelumnya tidak mendeklarasikan field tersebut.
 * Akibatnya TypeScript gagal dikompilasi dengan TS2339:
 *   Property 'category' does not exist on type 'CreateDepartmenDto'.
 */
export class CreateDepartmenDto {
  @IsString({ message: 'Hospital ID harus berupa string' })
  @IsNotEmpty({ message: 'Hospital ID tidak boleh kosong' })
  hospital_id: string;

  @IsString({ message: 'Nama departmen harus berupa string' })
  @IsNotEmpty({ message: 'Nama departmen tidak boleh kosong' })
  @MinLength(2, { message: 'Nama departmen minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama departmen maksimal 100 karakter' })
  name: string;

  @IsString({ message: 'Kode departmen harus berupa string' })
  @IsNotEmpty({ message: 'Kode departmen tidak boleh kosong' })
  @MinLength(2, { message: 'Kode departmen minimal 2 karakter' })
  @MaxLength(50, { message: 'Kode departmen maksimal 50 karakter' })
  departmen_code: string;

  @IsOptional()
  @IsEnum(CategoryDepartmen, {
    message:
      'Kategori departmen tidak valid (ADMIN, GENERALIST, SPECIALIST, LABORATORY, PHARMACY, NURSING, LOGISTIC)',
  })
  category?: CategoryDepartmen;

  @IsOptional()
  @IsString({ message: 'Alamat departmen harus berupa string' })
  @MinLength(3, { message: 'Alamat departmen minimal 3 karakter' })
  @MaxLength(500, { message: 'Alamat departmen maksimal 500 karakter' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Kota departmen harus berupa string' })
  city?: string;

  @IsOptional()
  @IsBoolean({ message: 'is_active harus berupa boolean' })
  is_active?: boolean;
}
