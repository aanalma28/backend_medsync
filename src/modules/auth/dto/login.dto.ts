import {
  IsString,
  IsEmail,
  IsBoolean,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @IsIn(['pasien', 'dokter', 'apoteker'], {
    message: 'Role harus salah satu dari: pasien, dokter, apoteker',
  })
  role: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(100, { message: 'Email maksimal 100 karakter' })
  email: string;

  @IsString({ message: 'Password harus berupa string' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  password: string;

  @IsBoolean({ message: 'Remember me harus berupa boolean' })
  remember_me: boolean;
}
