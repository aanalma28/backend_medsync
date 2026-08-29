import { IsOptional, IsInt, IsString, Min } from 'class-validator';

/**
 * DTO for querying patient's appointment list.
 */
export class QueryAppointmentDto {
  @IsOptional()
  @IsInt({ message: 'Page harus berupa angka bulat' })
  @Min(1, { message: 'Page minimal 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'status harus berupa string status (PENDING, CONFIRMED, CANCELLED, COMPLETED)' })
  status?: string;
}
