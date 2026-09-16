import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for manually updating visit status from the doctor dashboard.
 */
export class UpdateDoctorVisitStatusDto {
  @IsString({ message: 'Status harus berupa string' })
  @IsNotEmpty({ message: 'Status tidak boleh kosong' })
  @IsIn(['DOCTOR_EXAMINED', 'CANCELLED'], {
    message:
      'Dokter hanya dapat mengubah status kunjungan menjadi DOCTOR_EXAMINED atau CANCELLED',
  })
  status!: 'DOCTOR_EXAMINED' | 'CANCELLED';
}
