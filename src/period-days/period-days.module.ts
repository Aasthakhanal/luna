import { Module } from '@nestjs/common';
import { PeriodDaysService } from './period-days.service';
import { PeriodDaysController } from './period-days.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CyclesService } from 'src/cycles/cycles.service';
import { UsersService } from 'src/users/users.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Module({
  controllers: [PeriodDaysController],
  providers: [
    PeriodDaysService,
    PrismaService,
    CyclesService,
    UsersService,
    NotificationsService,
  ],
})
export class PeriodDaysModule {}
