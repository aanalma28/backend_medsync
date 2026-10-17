import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequisitionStatus } from '../../../../generated/prisma/enums.js';

export class QueryRequisitionDto {
  @IsOptional()
  @IsEnum(RequisitionStatus, {
    message:
      'Status requisition harus salah satu dari: PENDING, APPROVED, PARTIAL, REJECTED, SHIPPED, COMPLETED, CANCELLED',
  })
  status?: RequisitionStatus;

  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsString({ message: 'Page harus berupa angka' })
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString({ message: 'Limit harus berupa angka' })
  @MaxLength(10)
  limit?: string;
}
