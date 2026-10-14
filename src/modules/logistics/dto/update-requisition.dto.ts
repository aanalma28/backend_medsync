import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { RequisitionStatus } from '../../../../generated/prisma/enums.js';

const editableRequisitionStatuses = [
  RequisitionStatus.APPROVED,
  RequisitionStatus.PARTIAL,
  RequisitionStatus.REJECTED,
];

export class UpdateRequisitionItemDto {
  @IsString()
  requisition_item_id!: string;

  @IsInt()
  @Min(0)
  quantity_approved!: number;
}

export class UpdateRequisitionDto {
  @IsEnum(editableRequisitionStatuses, {
    message: 'Status tujuan harus APPROVED, PARTIAL, atau REJECTED',
  })
  status!: RequisitionStatus;

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal satu item requisition harus dikirim' })
  @ValidateNested({ each: true })
  @Type(() => UpdateRequisitionItemDto)
  items!: UpdateRequisitionItemDto[];
}
