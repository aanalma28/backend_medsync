import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * A single prescribed medicine line.
 * product_id references Products.id and rules_using holds
 * the instruction text (e.g. "3x1 sehari setelah makan").
 */
export class CreateRecipeDetailDto {
  @IsString({ message: 'product_id harus berupa string' })
  @IsNotEmpty({ message: 'product_id tidak boleh kosong' })
  product_id: string;

  @IsString({ message: 'rules_using harus berupa string' })
  @IsNotEmpty({ message: 'Aturan pemakaian tidak boleh kosong' })
  rules_using: string;
}

/**
 * Payload for recording a doctor examination.
 * Combines SOAP notes (DoctorAssesment) and the prescription (DoctorRecipe + RecipeDetail).
 */
export class CreateDoctorExaminationDto {
  @IsString({ message: 'visitId harus berupa string' })
  @IsNotEmpty({ message: 'visitId tidak boleh kosong' })
  visitId: string;

  // ===== SOAP =====
  @IsOptional()
  @IsString()
  subjective?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  doctorNotes?: string;

  // ===== Prescription =====
  @IsOptional()
  @IsString({ message: 'no_trx harus berupa string' })
  no_trx?: string;

  @IsOptional()
  @IsString({ message: 'recipe_date_exec harus berupa string ISO date' })
  recipe_date_exec?: string;

  @IsOptional()
  @IsString({ message: 'take_med_date harus berupa string ISO date' })
  take_med_date?: string;

  @IsArray({ message: 'details harus berupa array' })
  @ArrayMinSize(1, { message: 'Minimal harus ada 1 obat dalam resep' })
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeDetailDto)
  details: CreateRecipeDetailDto[];
}
