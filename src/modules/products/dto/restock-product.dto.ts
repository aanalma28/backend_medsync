import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RestockProductDto {
  @IsNotEmpty({ message: 'Jumlah restock wajib diisi' })
  @IsNumber({}, { message: 'Jumlah harus berupa angka' })
  @Min(1, { message: 'Jumlah restock minimal 1' })
  quantity: number;

  @IsNotEmpty({ message: 'Harga beli supplier wajib diisi' })
  @IsNumber({}, { message: 'Harga beli harus berupa angka' })
  @Min(0, { message: 'Harga beli minimal 0' })
  buy_price: number;

  @IsOptional()
  @IsString({ message: 'Tanggal kedaluwarsa harus berupa string tanggal YYYY-MM-DD' })
  exp_date?: string;

  @IsOptional()
  @IsString({ message: 'Nama supplier harus berupa string' })
  supplierName?: string;

  @IsOptional()
  @IsString({ message: 'Nomor referensi / faktur harus berupa string' })
  reference_number?: string;

  @IsOptional()
  @IsString({ message: 'Catatan harus berupa string' })
  notes?: string;
}
