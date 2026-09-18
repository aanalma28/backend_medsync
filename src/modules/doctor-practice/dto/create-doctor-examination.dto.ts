import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Detail obat / item resep yang dikirim dari frontend medicines
 */
export class CreateRecipeDetailDto {
  @IsString({ message: 'product_id harus berupa string' })
  @IsNotEmpty({ message: 'product_id tidak boleh kosong' })
  id: string;

  @IsString({ message: 'Nama harus berupa string' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'rules_using harus berupa string' })
  @IsNotEmpty({ message: 'Aturan pemakaian tidak boleh kosong' })
  usage: string;
}

/**
 * Representasi objek doctorCheck dari frontend snapshot.
 * Menampung asesmen medis (SOAP).
 */
export class DoctorCheckDto {
  @IsOptional()
  @IsString()
  subjective?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  // Menampung assessment standar
  @IsOptional()
  @IsString()
  assessment?: string;

  // Menampung variasi ejaan/typo 'assesment' (dua huruf 's') yang dikirim frontend
  @IsOptional()
  @IsString()
  assesment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Representasi objek snapshot (Receipt) yang dikirim dari frontend
 */
export class ExaminationSnapshotDto {
  @IsString({ message: 'visitId harus berupa string' })
  @IsNotEmpty({ message: 'visitId tidak boleh kosong' })
  visitId?: string;

  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @ValidateNested()
  @Type(() => DoctorCheckDto)
  doctorCheck: DoctorCheckDto;

  @IsArray({ message: 'medicines harus berupa array' })
  @ArrayMinSize(1, { message: 'Minimal harus ada 1 obat dalam resep' })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeDetailDto)
  medicines: CreateRecipeDetailDto[];
}

/**
 * Payload utama untuk pencatatan pemeriksaan dokter
 */
export class CreateDoctorExaminationDto {
  @ValidateNested()
  @Type(() => ExaminationSnapshotDto)
  snapshot: ExaminationSnapshotDto;
}