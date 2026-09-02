import { IsOptional, IsString } from 'class-validator';

export class CancelPrescriptionDto {
  @IsOptional()
  @IsString({ message: 'Alasan pembatalan harus berupa string' })
  cancel_reason?: string;
}
