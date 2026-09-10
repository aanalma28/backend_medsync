import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * DTO for creating/assigning a slot appointment for a patient.
 */
export class CreateAppointmentDto {
  @IsNotEmpty({ message: 'patient_id wajib diisi' })
  @IsString({ message: 'patient_id harus berupa string ID pasien' })
  patient_id!: string;

  @IsNotEmpty({ message: 'slot_practice_id wajib diisi' })
  @IsString({ message: 'slot_practice_id harus berupa string ID slot' })
  slot_practice_id!: string;

  @IsOptional()
  @IsString({ message: 'Keluhan harus berupa string' })
  complaint?: string;

  @IsOptional()
  @IsString({ message: 'Detail gejala harus berupa string' })
  detail_sympton?: string;
}
