import {
  IsString,
  IsEmail,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
  Equals,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Role harus berupa string' })
  @Equals('pasien', { message: 'Role harus bernilai pasien' })
  role: string;

  @IsString({ message: 'Nama lengkap harus berupa string' })
  @MinLength(3, { message: 'Nama lengkap minimal 3 karakter' })
  @MaxLength(100, { message: 'Nama lengkap maksimal 100 karakter' })
  name: string;

  @IsString({ message: 'Nomor handphone harus berupa string' })
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, {
    message: 'Format nomor handphone tidak valid (contoh: 08xxxxxxxxxx)',
  })
  phone: string;

  @IsDateString({}, { message: 'Format tanggal lahir tidak valid (gunakan YYYY-MM-DD)' })
  birth_date: string;

  @IsString({ message: 'Alamat harus berupa string' })
  @MinLength(5, { message: 'Alamat minimal 5 karakter' })
  @MaxLength(500, { message: 'Alamat maksimal 500 karakter' })
  address: string;

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
  confirm_password: string;

  @IsBoolean({ message: 'Persetujuan penggunaan harus berupa boolean' })
  @Equals(true, {
    message: 'Anda harus menyetujui syarat dan ketentuan penggunaan',
  })
  accepted_terms: boolean;
}
