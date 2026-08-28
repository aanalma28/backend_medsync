import { IsString, IsOptional, MinLength, MaxLength, IsBoolean } from 'class-validator';

export class UpdateDepartmenDto {
  @IsOptional()
  @IsString({ message: 'Nama departmen harus berupa string' })
  @MinLength(2, { message: 'Nama departmen minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama departmen maksimal 100 karakter' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Kode departmen harus berupa string' })
  @MinLength(2, { message: 'Kode departmen minimal 2 karakter' })
  @MaxLength(50, { message: 'Kode departmen maksimal 50 karakter' })
  departmen_code?: string;

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
