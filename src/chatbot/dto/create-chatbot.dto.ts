import { IsString } from 'class-validator';

export class CreateChatbotDto {
  @IsString()
  message: string;

  
}
