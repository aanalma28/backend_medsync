import { IsOptional, IsString } from 'class-validator';

export class QueryHospitalDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  is_active?: string;
}
