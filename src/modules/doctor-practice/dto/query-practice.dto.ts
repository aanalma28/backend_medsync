import { IsOptional, IsInt, IsString, Min } from 'class-validator';

/**
 * DTO for querying/filtering doctor practice schedules.
 */
export class QueryPracticeDto {
  @IsOptional()
  @IsInt({ message: 'Page harus berupa angka bulat' })
  @Min(1, { message: 'Page minimal 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'date_from harus berupa string ISO date' })
  date_from?: string;

  @IsOptional()
  @IsString({ message: 'date_to harus berupa string ISO date' })
  date_to?: string;
}
