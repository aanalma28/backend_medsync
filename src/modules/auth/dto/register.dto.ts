import {
  IsString,
  IsEmail,
  IsBoolean,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
  Equals,
} from 'class-validator';

export class RegisterDto {
  @IsIn(['pasien', 'dokter', 'apoteker'], {
    message: 'Role harus salah satu dari: pasien, dokter, apoteker',
  })
  role: string;

  @IsString({ message: 'Nama harus berupa string' })
  @MinLength(3, { message: 'Nama minimal 3 karakter' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name: string;

  @IsString({ message: 'Nomor pasien harus berupa string' })
  @MinLength(3, { message: 'Nomor pasien minimal 3 karakter' })
  @MaxLength(50, { message: 'Nomor pasien maksimal 50 karakter' })
  user_code: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(100, { message: 'Email maksimal 100 karakter' })
  email: string;

  @IsString({ message: 'Password harus berupa string' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password harus mengandung minimal 1 huruf besar, 1 huruf kecil, dan 1 angka',
  })
  password: string;

  @IsString({ message: 'Konfirmasi password harus berupa string' })
  @MinLength(8, { message: 'Konfirmasi password minimal 8 karakter' })
  @MaxLength(128, { message: 'Konfirmasi password maksimal 128 karakter' })
  confirm_password: string;

  @IsBoolean({ message: 'Accepted terms harus berupa boolean' })
  @Equals(true, {
    message: 'Anda harus menyetujui syarat dan ketentuan',
  })
  accepted_terms: boolean;
}
