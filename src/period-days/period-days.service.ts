import { Injectable } from '@nestjs/common';
import { CreatePeriodDayDto } from './dto/create-period-day.dto';
import { UpdatePeriodDayDto } from './dto/update-period-day.dto';
import { FindAllPeriodDaysDto } from './dto/find-all-period-days.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CyclesService } from 'src/cycles/cycles.service';
import { UsersService } from 'src/users/users.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PeriodDaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly usersService: UsersService,
  ) {}
  async create(createPeriodDayDto: CreatePeriodDayDto) {
    await this.cyclesService.findOne(createPeriodDayDto.cycle_id);
    await this.usersService.findOne(createPeriodDayDto.user_id);
    return await this.prisma.periodDay.create({
      data: createPeriodDayDto,
    });
  }

  async findAll(query: FindAllPeriodDaysDto) {
    const { page = 1, limit = 10, search, user_id, cycle_id } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PeriodDayWhereInput = {
      user_id,
      ...(cycle_id && { cycle_id }),
      ...(search && {
        OR: [{ flow_level: search as Prisma.EnumFlowLevelFilter }],
      }),
    };

    const [periodDays, total] = await Promise.all([
      this.prisma.periodDay.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.periodDay.count({}),
    ]);
    return {
      data: periodDays,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, user_id?: number) {
    console.log('idd', id);
    const periodDay = await this.prisma.periodDay.findFirst({
      where: { id, ...(user_id && { user_id }) },
    });
    if (!periodDay) {
      throw new Error(`PeriodDay with id ${id} not found`);
    }
    return periodDay;
  }

  async update(id: number, updatePeriodDayDto: UpdatePeriodDayDto) {
    await this.findOne(id, updatePeriodDayDto.user_id as number);
    if (updatePeriodDayDto.cycle_id) {
      await this.cyclesService.findOne(updatePeriodDayDto.cycle_id);
    }
    return await this.prisma.periodDay.update({
      where: { id },
      data: updatePeriodDayDto,
    });
  }

  async remove(id: number, user_id: number) {
    await this.findOne(id, user_id);
    return this.prisma.periodDay.delete({
      where: { id },
    });
  }
  async findTodayByUserId(user_id: number) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.periodDay.findFirst({
      where: {
        user_id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }
}
