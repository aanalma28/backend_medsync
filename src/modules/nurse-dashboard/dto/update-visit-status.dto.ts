import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateVisitStatusDto {
  @IsString({ message: 'Status harus berupa string' })
  @IsNotEmpty({ message: 'Status tidak boleh kosong' })
  @IsIn(['CANCELLED'], {
    message: 'Perawat hanya dapat mengubah status secara manual menjadi CANCELLED',
  })
  status!: 'CANCELLED';
}
