import { IrregularityType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateIrregularityDto {
  @IsOptional()
  @IsNumber()
  user_id: number;
  
  @IsNotEmpty()
  @IsNumber()
  cycle_id: number;

  @IsNotEmpty()
  @IsEnum(IrregularityType)
  irregularity_type: IrregularityType;
}
