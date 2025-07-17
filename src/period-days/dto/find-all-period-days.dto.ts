import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FindAllPeriodDaysDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsNumber()
  @IsOptional()
  user_id: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cycle_id?: number;
}
