import { Injectable } from '@nestjs/common';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { FindAllCyclesDto } from './dto/find-all-cycles.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { differenceInDays } from 'date-fns';
import { Prisma } from '@prisma/client';

@Injectable()
export class CyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}
  async create(createCycleDto: CreateCycleDto) {
    await this.usersService.findOne(createCycleDto.user_id);
    const startDate = new Date();
    const predictedEndDate = new Date(startDate);
    predictedEndDate.setDate(predictedEndDate.getDate() + 28);

    createCycleDto.start_date = startDate;
    createCycleDto.predicted_start_date = startDate;
    createCycleDto.predicted_end_date = predictedEndDate;



    const cycle = await this.prisma.cycle.create({
      data: createCycleDto,
    });


    await this.checkAndCreateIrregularities(cycle.id);

    return cycle;
  }

  async findAll(query: FindAllCyclesDto) {
    const { page = 1, limit = 10, search, user_id } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.CycleWhereInput = {
      user_id
    }
    const [cycles, total] = await Promise.all([
      this.prisma.cycle.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.cycle.count({}),
    ]);
    return {
      data: cycles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, user_id?: number) {
    const cycle = await this.prisma.cycle.findUnique({
      where: { id, 
        ...(user_id && { user_id }) },
    });
    if (!cycle) {
      throw new Error(`Cycle with id ${id} not found`);
    }
    return cycle;
  }

  async update(id: number, updateCycleDto: UpdateCycleDto) {
    await this.findOne(id);
    if (updateCycleDto.user_id) {
      await this.usersService.findOne(updateCycleDto.user_id);
    }
    if (updateCycleDto.start_date) {
      updateCycleDto.start_date = new Date(updateCycleDto.start_date);
    }

    if (updateCycleDto.end_date) {
      updateCycleDto.end_date = new Date(updateCycleDto.end_date);
    }

    if (updateCycleDto.description) {
      updateCycleDto.description = updateCycleDto.description.trim();
    }
    return await this.prisma.cycle.update({
      where: { id },
      data: updateCycleDto,
    });
  }

  async remove(id: number, user_id: number) {
    await this.findOne(id, user_id);
    return this.prisma.cycle.delete({
      where: { id },
    });
  }
  private async checkAndCreateIrregularities(cycleId: number) {
    const cycle = await this.prisma.cycle.findUnique({
      where: { id: cycleId },
      include: { period_days: true },
    });

    if (!cycle) return;

    const irregularities: (
      | 'short_cycle'
      | 'long_cycle'
      | 'missed_period'
      | 'heavy_flow'
      | 'light_flow'
    )[] = [];

    // Check for short/long cycle
    if (cycle.end_date) {
      const length = differenceInDays(
        new Date(cycle.end_date),
        new Date(cycle.start_date),
      );
      if (length < 21) irregularities.push('short_cycle');
      else if (length > 35) irregularities.push('long_cycle');
    }

    // Check for missed period
    if (!cycle.end_date) {
      const daysSinceStart = differenceInDays(
        new Date(),
        new Date(cycle.start_date),
      );
      if (daysSinceStart > 45) irregularities.push('missed_period');
    }

    // Check for heavy/light flow
    const periodLength = cycle.period_days.length;
    if (periodLength > 7) irregularities.push('heavy_flow');
    else if (periodLength < 2) irregularities.push('light_flow');

    // Save irregularities
    for (const type of irregularities) {
      const existing = await this.prisma.irregularity.findFirst({
        where: {
          cycle_id: cycle.id,
          irregularity_type: type,
        },
      });

      if (!existing) {
        await this.prisma.irregularity.create({
          data: {
            user_id: cycle.user_id,
            cycle_id: cycle.id,
            irregularity_type: type,
          },
        });
      }
    }
  }
}
