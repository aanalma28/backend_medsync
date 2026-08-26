import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Role } from '../../../../generated/prisma/client.js';

export class QueryUserDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  departmen_id?: string;

  @IsOptional()
  @IsString()
  is_active?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
