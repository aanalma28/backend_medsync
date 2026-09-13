import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateNursingAssessmentDto {
  @IsString()
  @IsNotEmpty()
  visitId!: string;

  @IsInt()
  systolic!: number;

  @IsInt()
  diastolic!: number;

  @IsNumber()
  temperature!: number;

  @IsInt()
  heartRate!: number;

  @IsNumber()
  weight!: number;

  @IsNumber()
  height!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}