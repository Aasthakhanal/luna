import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import * as firebase from 'firebase-admin';
import { sendNotificationDTO } from './dto/send-notification.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async sendPush(notification: sendNotificationDTO) {
    try {
      await firebase.messaging().send({
        notification: {
          title: notification.title,
          body: notification.body,
        },
        token: notification.device_id,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default',
            },
          },
        },
      });
      await this.prisma.notification.create({
        data: {
          title: notification.title,
          body: notification.body,
          device_id: notification.device_id,
          user_id: Number(notification.user_id),
        },
      });

      return { success: true, message: 'Notification sent and saved.' };
    } catch (error) {
      console.error('Notification Error:', error);
      return { success: false, message: 'Failed to send notification', error };
    }
  }

  create(createNotificationDto: CreateNotificationDto) {
    return 'This action adds a new notification';
  }

  findAll() {
    return `This action returns all notifications`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notification`;
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  remove(id: number) {
    return `This action removes a #${id} notification`;
  }
}
