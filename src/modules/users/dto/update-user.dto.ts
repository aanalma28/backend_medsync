import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Role } from '../../../../generated/prisma/client.js';

export class UpdateUserDto {
  @IsString({ message: 'Nama harus berupa string' })
  @IsOptional()
  name?: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Password harus berupa string' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @IsOptional()
  password?: string;

  @IsString({ message: 'Telepon harus berupa string' })
  @IsOptional()
  phone?: string;

  @IsString({ message: 'Alamat harus berupa string' })
  @IsOptional()
  address?: string;

  @IsDateString({}, { message: 'Tanggal lahir harus berupa format ISO date string (YYYY-MM-DD)' })
  @IsOptional()
  birth_date?: string;

  @IsBoolean({ message: 'Status is_active harus berupa boolean' })
  @IsOptional()
  is_active?: boolean;

  @IsString({ message: 'Departmen ID harus berupa string' })
  @IsOptional()
  departmen_id?: string;

  @IsEnum(Role, { message: 'Role tidak valid' })
  @IsOptional()
  role?: Role;
}
