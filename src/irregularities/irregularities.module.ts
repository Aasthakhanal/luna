import { Module } from '@nestjs/common';
import { IrregularitiesService } from './irregularities.service';
import { IrregularitiesController } from './irregularities.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { CyclesService } from 'src/cycles/cycles.service';

@Module({
  controllers: [IrregularitiesController],
  providers: [IrregularitiesService, PrismaService, UsersService, CyclesService],
})
export class IrregularitiesModule {}
