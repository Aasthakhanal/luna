import { Module } from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { CyclesController } from './cycles.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Module({
  controllers: [CyclesController],
  providers: [CyclesService, PrismaService, UsersService, NotificationsService],
})
export class CyclesModule {}
