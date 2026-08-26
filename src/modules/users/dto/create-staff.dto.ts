import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

export enum StaffRole {
  SUPERADMIN = 'SUPERADMIN',
  MASTERADMIN = 'MASTERADMIN',
  REGISTER_ADMIN = 'REGISTER_ADMIN',
  DOCTOR = 'DOCTOR',
  PHARMACIST = 'PHARMACIST',
  NURSE = 'NURSE',
}

export class CreateStaffDto {
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

  @IsEnum(StaffRole, { message: 'Role staff tidak valid' })
  @IsNotEmpty({ message: 'Role staff tidak boleh kosong' })
  role: StaffRole;

  @IsString({ message: 'Departmen ID harus berupa string' })
  @IsNotEmpty({ message: 'Departmen tidak boleh kosong' })
  departmen_id: string;

  @IsString({ message: 'Telepon harus berupa string' })
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  phone: string;

  @IsString({ message: 'Alamat harus berupa string' })
  @IsOptional()
  address?: string;

  @IsDateString({}, { message: 'Tanggal lahir harus berupa format ISO date string (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Tanggal lahir tidak boleh kosong' })
  birth_date: string;
}
