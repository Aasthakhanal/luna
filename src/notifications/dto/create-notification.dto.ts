import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
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
  @IsString()
  user_id: string;

  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
