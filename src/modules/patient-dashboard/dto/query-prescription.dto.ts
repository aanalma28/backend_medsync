import { IsOptional, IsEnum, IsIn } from 'class-validator';

export enum PatientRecipeStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class QueryPatientPrescriptionDto {
  @IsOptional()
  @IsEnum(PatientRecipeStatusEnum, {
    message: 'Status harus berupa PENDING, CONFIRMED, COMPLETED, atau CANCELLED',
  })
  status?: PatientRecipeStatusEnum;

  @IsOptional()
  @IsIn(['active', 'history'], {
    message: 'Type harus berupa active atau history',
  })
  type?: 'active' | 'history';
}
