import { IsString, IsOptional, MinLength, MaxLength, IsBoolean } from 'class-validator';

export class UpdateHospitalDto {
  @IsOptional()
  @IsString({ message: 'Nama hospital harus berupa string' })
  @MinLength(2, { message: 'Nama hospital minimal 2 karakter' })
  @MaxLength(150, { message: 'Nama hospital maksimal 150 karakter' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Kode hospital harus berupa string' })
  @MinLength(2, { message: 'Kode hospital minimal 2 karakter' })
  @MaxLength(50, { message: 'Kode hospital maksimal 50 karakter' })
  hospital_code?: string;

  @IsOptional()
  @IsString({ message: 'Alamat hospital harus berupa string' })
  @MinLength(3, { message: 'Alamat hospital minimal 3 karakter' })
  @MaxLength(500, { message: 'Alamat hospital maksimal 500 karakter' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'User ID (Pemilik) harus berupa string' })
  user_id?: string;

  @IsOptional()
  @IsBoolean({ message: 'is_active harus berupa boolean' })
  is_active?: boolean;
}
