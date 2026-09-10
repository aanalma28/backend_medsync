import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class FamilyPatientDto {
  @IsString({ message: 'Nama harus berupa string' })
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  name: string;

  @IsEnum(['LAKILAKI', 'PEREMPUAN'], {
    message: 'Gender harus LAKILAKI atau PEREMPUAN',
  })
  @IsOptional()
  gender?: 'LAKILAKI' | 'PEREMPUAN';

  @IsInt({ message: 'Usia harus berupa angka bulat' })
  @Min(0, { message: 'Usia tidak boleh kurang dari 0' })
  age: number;

  @IsString({ message: 'Alergi obat harus berupa string' })
  @IsOptional()
  medicine_allergy?: string;

  @IsString({ message: 'user_id harus berupa string' })
  @IsOptional()
  user_id?: string;
}

export class UpdateFamilyPatientDto {
  @IsString({ message: 'Nama harus berupa string' })
  @IsOptional()
  name?: string;

  @IsEnum(['LAKILAKI', 'PEREMPUAN'], {
    message: 'Gender harus LAKILAKI atau PEREMPUAN',
  })
  @IsOptional()
  gender?: 'LAKILAKI' | 'PEREMPUAN';

  @IsInt({ message: 'Usia harus berupa angka bulat' })
  @Min(0, { message: 'Usia tidak boleh kurang dari 0' })
  @IsOptional()
  age?: number;

  @IsString({ message: 'Alergi obat harus berupa string' })
  @IsOptional()
  medicine_allergy?: string;
}