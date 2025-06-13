import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { IsNumber } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsOptional()
  @IsNumber()
  user_id: number;
}
