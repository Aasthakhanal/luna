import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CapitalizeTransformer } from 'src/transformers/capitalize.transformer';
import { IsUnique } from 'src/validators/is-unique-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @CapitalizeTransformer()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @IsUnique('user', 'email')
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(15)
  @IsUnique('user', 'phone_number')
  phone_number: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
