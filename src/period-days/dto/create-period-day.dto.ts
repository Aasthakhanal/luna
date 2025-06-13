import { FlowLevel } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePeriodDayDto {
  @IsNumber()
  @IsNotEmpty()
  cycle_id: number;

  @IsNotEmpty()
  @IsEnum(FlowLevel)
  flow_level: FlowLevel;

  @IsDate()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  date: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsOptional()
  user_id: number;
}
