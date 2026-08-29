import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for creating/assigning a slot appointment for a patient.
 */
export class CreateAppointmentDto {
  @IsNotEmpty({ message: 'slot_practice_id wajib diisi' })
  @IsString({ message: 'slot_practice_id harus berupa string ID slot' })
  slot_practice_id: string;
}
