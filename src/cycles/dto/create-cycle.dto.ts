import { PhaseType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCycleDto {
  @IsNumber()
  @IsOptional()
  user_id: number;

  @IsDateString()
  @IsOptional()
  start_date: Date;

  @IsDateString()
  @IsOptional()
  predicted_start_date: Date;

  @IsDateString()
  @IsOptional()
  end_date?: Date;

  @IsDateString()
  @IsOptional()
  predicted_end_date: Date;

  @IsOptional()
  @IsString()
  description?: string;
}
