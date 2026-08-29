import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

/**
 * DTO for toggling slot is_active (soft-delete).
 */
export class ToggleSlotActiveDto {
  @IsBoolean({ message: 'is_active harus berupa boolean' })
  is_active: boolean;
}

/**
 * DTO for updating slot status (OPEN/CLOSED).
 */
export class UpdateSlotStatusDto {
  @IsEnum(['OPEN', 'CLOSED'], { message: 'status_slot harus OPEN atau CLOSED' })
  status_slot: string;
}
