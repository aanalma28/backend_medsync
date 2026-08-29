import { IsOptional, IsInt, IsString, Min } from 'class-validator';

/**
 * DTO for querying doctor practice schedules by date, department, or search query.
 */
export class QueryDoctorScheduleDto {
  @IsOptional()
  @IsInt({ message: 'Page harus berupa angka bulat' })
  @Min(1, { message: 'Page minimal 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'Limit harus berupa angka bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'date harus berupa string tanggal (YYYY-MM-DD)' })
  date?: string;

  @IsOptional()
  @IsString({ message: 'date_from harus berupa string tanggal (YYYY-MM-DD)' })
  date_from?: string;

  @IsOptional()
  @IsString({ message: 'date_to harus berupa string tanggal (YYYY-MM-DD)' })
  date_to?: string;

  @IsOptional()
  @IsString({ message: 'departmen_id harus berupa string ID departemen' })
  departmen_id?: string;

  @IsOptional()
  @IsString({ message: 'search harus berupa string pencarian' })
  search?: string;
}
