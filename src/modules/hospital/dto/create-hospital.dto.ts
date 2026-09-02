import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateHospitalDto {
  @IsString({ message: 'Nama hospital harus berupa string' })
  @IsNotEmpty({ message: 'Nama hospital tidak boleh kosong' })
  @MinLength(2, { message: 'Nama hospital minimal 2 karakter' })
  @MaxLength(150, { message: 'Nama hospital maksimal 150 karakter' })
  name: string;

  @IsString({ message: 'Kode hospital harus berupa string' })
  @IsNotEmpty({ message: 'Kode hospital tidak boleh kosong' })
  @MinLength(2, { message: 'Kode hospital minimal 2 karakter' })
  @MaxLength(50, { message: 'Kode hospital maksimal 50 karakter' })
  hospital_code: string;

  @IsString({ message: 'Alamat hospital harus berupa string' })
  @IsNotEmpty({ message: 'Alamat hospital tidak boleh kosong' })
  @MinLength(3, { message: 'Alamat hospital minimal 3 karakter' })
  @MaxLength(500, { message: 'Alamat hospital maksimal 500 karakter' })
  address: string;

  @IsString({ message: 'User ID (Pemilik) harus berupa string' })
  @IsOptional()
  user_id?: string;
}
