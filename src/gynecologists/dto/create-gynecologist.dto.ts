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

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}
