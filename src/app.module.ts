import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BullModule } from '@nestjs/bull';
import { IsUniqueConstraint } from './validators/is-unique-validator';
import { CyclesModule } from './cycles/cycles.module';
import { PeriodDaysModule } from './period-days/period-days.module';
import { IrregularitiesModule } from './irregularities/irregularities.module';
import { GynecologistsModule } from './gynecologists/gynecologists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT!),
      },
    }),
    CyclesModule,
    PeriodDaysModule,
    IrregularitiesModule,
    GynecologistsModule,
    NotificationsModule,
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, IsUniqueConstraint],
})
export class AppModule {}
