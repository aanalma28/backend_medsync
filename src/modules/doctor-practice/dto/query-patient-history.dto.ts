import { IsOptional, IsInt, IsString, Min } from 'class-validator';

/**
 * DTO for querying patient medical history handled by the doctor.
 */
export class QueryPatientHistoryDto {
  @IsOptional()
  @IsInt({ message: 'Page harus berupa angka bulat' })
  @Min(1, { message: 'Page minimal 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'Search harus berupa string' })
  search?: string;
}
