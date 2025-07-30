import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { firebaseAdminProvider } from './firebase-admin.provider';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [NotificationsController],
  providers: [firebaseAdminProvider, NotificationsService, PrismaService],
})
export class NotificationsModule {}
