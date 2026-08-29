import { IsEnum } from 'class-validator';

/**
 * DTO for updating appointment status.
 */
export class UpdateAppointmentStatusDto {
  @IsEnum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'], {
    message: 'Status harus PENDING, CONFIRMED, CANCELLED, atau COMPLETED',
  })
  status: string;
}
