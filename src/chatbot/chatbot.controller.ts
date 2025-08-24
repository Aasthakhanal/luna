// chatbot.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { CreateChatbotDto } from './dto/create-chatbot.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async chat(@Body() body: CreateChatbotDto) {
    console.log(body, 'Body');
    return this.chatbotService.sendMessage(body.message);
  }
}
