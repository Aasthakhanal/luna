import { Transform, Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FindAllCyclesDto {
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
  user_id?: number;

  @IsDate()
  @IsOptional()
  @Transform(() => Date)
  date?: Date;
}
