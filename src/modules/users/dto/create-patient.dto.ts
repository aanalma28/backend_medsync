import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreatePatientDto {
  @IsString({ message: 'Nama harus berupa string' })
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  name: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @IsString({ message: 'Telepon harus berupa string' })
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  phone: string;

  @IsString({ message: 'Alamat harus berupa string' })
  @IsNotEmpty({ message: 'Alamat tidak boleh kosong' })
  address: string;

  @IsDateString({}, { message: 'Tanggal lahir harus berupa format ISO date string (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Tanggal lahir tidak boleh kosong' })
  birth_date: string;

  @IsBoolean({ message: 'Accepted terms harus berupa boolean' })
  @IsOptional()
  accepted_terms?: boolean;
}
