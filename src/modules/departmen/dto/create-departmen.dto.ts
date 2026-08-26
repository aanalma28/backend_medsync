import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateDepartmenDto {
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

  @IsString({ message: 'Alamat departmen harus berupa string' })
  @IsNotEmpty({ message: 'Alamat departmen tidak boleh kosong' })
  @MinLength(3, { message: 'Alamat departmen minimal 3 karakter' })
  @MaxLength(500, { message: 'Alamat departmen maksimal 500 karakter' })
  address: string;
}
