import { Decimal } from '@prisma/client/runtime/library';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDecimal,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';

export class CreateGynecologistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  specialty: string;

  @Type(() => Decimal)
  @IsDecimal()
  @IsNotEmpty()
  latitude: Decimal;

  @Type(() => Decimal)
  @IsDecimal()
  @IsNotEmpty()
  longitude: Decimal;
}
