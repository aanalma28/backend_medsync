import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

/**
 * Role yang boleh dibuat melalui endpoint staff.
 *
 * Nilai enum ini harus SELALU menjadi subset dari `Role` di schema.prisma,
 * karena UsersService.createStaff meneruskan nilainya langsung ke Prisma.
 *
 * Sebelumnya enum ini memakai `DOCTOR`, yang TIDAK ADA di schema (schema
 * memakai GENERAL_DOCTOR dan SPECIALIST_DOCTOR), sehingga pembuatan akun
 * dokter selalu gagal dengan PrismaClientValidationError.
 *
 * `LOGISTIC` ditambahkan untuk Dashboard Logistik. Karena LOGISTIC bukan
 * bagian dari isNonEmployeeRole (hanya OWNER & SUPERADMIN), akun ini wajib
 * memiliki departmen_id dan akan memperoleh baris Employee — itulah yang
 * dipakai modul Logistik untuk me-resolve hospital_id pemanggil.
 */
export enum StaffRole {
  OWNER = 'OWNER',
  SUPERADMIN = 'SUPERADMIN',
  MASTERADMIN = 'MASTERADMIN',
  REGISTER_ADMIN = 'REGISTER_ADMIN',
  LOGISTIC = 'LOGISTIC',
  GENERAL_DOCTOR = 'GENERAL_DOCTOR',
  SPECIALIST_DOCTOR = 'SPECIALIST_DOCTOR',
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

  @IsOptional()
  @IsString({ message: 'Departmen ID harus berupa string' })
  departmen_id?: string;

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
