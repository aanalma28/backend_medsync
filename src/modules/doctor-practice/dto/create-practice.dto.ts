import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single practice slot.
 * Sent as part of the slots array when creating a practice schedule.
 */
export class CreateSlotDto {
  @IsString({ message: 'Nama slot harus berupa string' })
  @IsNotEmpty({ message: 'Nama slot tidak boleh kosong' })
  name: string;

  @IsString({ message: 'Jam mulai harus berupa string' })
  @IsNotEmpty({ message: 'Jam mulai tidak boleh kosong' })
  start_hour: string;

  @IsString({ message: 'Jam selesai harus berupa string' })
  @IsNotEmpty({ message: 'Jam selesai tidak boleh kosong' })
  end_hour: string;

  @IsOptional()
  @IsEnum(['OPEN', 'CLOSED'], { message: 'Status slot harus OPEN atau CLOSED' })
  status_slot?: string;

  @IsOptional()
  @IsBoolean({ message: 'is_active harus berupa boolean' })
  is_active?: boolean;

  @IsInt({ message: 'max_patient harus berupa angka bulat' })
  @Min(1, { message: 'max_patient minimal 1' })
  max_patient: number;
}

/**
 * DTO for creating a doctor practice schedule with slots.
 */
export class CreatePracticeDto {
  @IsString({ message: 'Tanggal praktek harus berupa string ISO date' })
  @IsNotEmpty({ message: 'Tanggal praktek tidak boleh kosong' })
  practice_date: string;

  @IsArray({ message: 'Slots harus berupa array' })
  @ArrayMinSize(1, { message: 'Minimal harus ada 1 slot' })
  @ValidateNested({ each: true })
  @Type(() => CreateSlotDto)
  slots: CreateSlotDto[];
}
