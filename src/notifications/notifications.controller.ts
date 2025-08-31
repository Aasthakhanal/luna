import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { sendNotificationDTO } from './dto/send-notification.dto';
import { FindAllNotificationsDto } from './dto/find-all-notification.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async sendNotification(@Body() pushNotification: sendNotificationDTO) {
    await this.notificationsService.sendPush(pushNotification);
  }

  @Get()
  async findAll(
    @Query() query: FindAllNotificationsDto,
    @Req() req: JwtPayload,
  ) {
    const { user_id } = req.payload;

    query.user_id = user_id;

    return this.notificationsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(+id, updateNotificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }

  @Post('user-daily-check')
  async userDailyCheck(@Req() req: JwtPayload) {
    const { user_id } = req.payload;
    return this.notificationsService.checkUserDailyStatus(user_id);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: JwtPayload) {
    const { user_id } = req.payload;
    return this.notificationsService.markAllAsRead(user_id);
  }
}
