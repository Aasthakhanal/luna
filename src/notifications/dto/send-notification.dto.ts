import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class sendNotificationDTO {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  body: string;

  @IsNotEmpty()
  @IsString()
  device_id: string;

  @IsOptional()
  @IsNumber()
  user_id: string;
}
