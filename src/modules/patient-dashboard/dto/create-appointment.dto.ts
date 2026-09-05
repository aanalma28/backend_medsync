import { IsNotEmpty, IsString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { Gender } from '../enums/gender.enum';

/**
 * DTO for creating/assigning a slot appointment for a patient.
 */
export class CreateAppointmentDto {
  @IsNotEmpty({ message: 'slot_practice_id wajib diisi' })
  @IsString({ message: 'slot_practice_id harus berupa string ID slot' })
  slot_practice_id: string;

  @IsOptional()
  @IsString({ message: 'Keluhan harus berupa string' })
  complaint?: string;

  @IsOptional()
  @IsString({ message: 'Detail gejala harus berupa string' })
  detail_sympton?: string;

  @IsNotEmpty({ message: 'Nama wajib diisi' })
  @IsString({ message: 'Nama harus berupa string' })
  patient_name: string;

  @IsNotEmpty({ message: 'Umur wajib diisi' })
  @IsInt({ message: 'Umur harus berupa integer' })
  patient_age: number;

  @IsNotEmpty({ message: 'Jenis kelamin wajib diisi' })
  @IsEnum(Gender, { message: 'Jenis kelamin harus salah satu dari: LAKILAKI, PEREMPUAN' })
  gender: Gender;
}
