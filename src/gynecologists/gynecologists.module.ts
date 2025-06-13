import { Module } from '@nestjs/common';
import { GynecologistsService } from './gynecologists.service';
import { GynecologistsController } from './gynecologists.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [GynecologistsController],
  providers: [GynecologistsService, PrismaService],
})
export class GynecologistsModule {}
