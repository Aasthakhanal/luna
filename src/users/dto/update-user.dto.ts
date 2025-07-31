import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsUnique } from 'src/validators/is-unique-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @IsUnique('user', 'email', 'id')
  email: string;

  @IsNotEmpty()
  @IsNumberString()
  @MinLength(5)
  @MaxLength(15)
  @IsUnique('user', 'phone_number', 'id')
  phone_number: string;
  user_id: number;
  fcm_token: string;
}
