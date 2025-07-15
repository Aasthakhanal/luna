import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { FindAllCyclesDto } from './dto/find-all-cycles.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { differenceInDays } from 'date-fns';
import { PhaseType, Prisma } from '@prisma/client';

@Injectable()
export class CyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}
  async create(createCycleDto: CreateCycleDto) {
    const user = await this.usersService.findOne(createCycleDto.user_id);

    const avgCycleLength = user.avg_cycle_length || 28;
    const avgPeriodLength = user.avg_period_length || 5;

    //  start and predicted end dates  // Use provided start_date or default to today
    const startDate = createCycleDto.start_date
      ? new Date(createCycleDto.start_date)
      : new Date();

    const startOfMonth = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
    );

    const cyclesInMonth = await this.prisma.cycle.findMany({
      where: {
        user_id: createCycleDto.user_id,
        start_date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    for (const cycle of cyclesInMonth) {
      const menstruationStart = new Date(cycle.start_date);
      const menstruationEnd = new Date(menstruationStart);
      menstruationEnd.setDate(menstruationEnd.getDate() + avgPeriodLength - 1);

      if (startDate >= menstruationStart && startDate <= menstruationEnd) {
        throw new BadRequestException(
          `Cannot create a new cycle. The selected start date falls within the menstruation phase (${menstruationStart.toDateString()} – ${menstruationEnd.toDateString()}) of an existing cycle this month.`,
        );
      }
    }
    const previousCycle = await this.prisma.cycle.findFirst({
      where: {
        user_id: createCycleDto.user_id,
        start_date: {
          lt: startDate,
        },
      },
      orderBy: {
        start_date: 'desc',
      },
    });

    if (previousCycle) {
      const newEndDate = new Date(startDate);
      newEndDate.setDate(newEndDate.getDate() - 1);

      await this.prisma.cycle.update({
        where: { id: previousCycle.id },
        data: { end_date: newEndDate },
      });
    }
    const predictedEndDate = new Date(startDate);
    predictedEndDate.setDate(predictedEndDate.getDate() + avgCycleLength - 1);

    createCycleDto.start_date = startDate;
    createCycleDto.predicted_start_date = startDate;
    createCycleDto.predicted_end_date = predictedEndDate;

    const cycle = await this.prisma.cycle.create({
      data: createCycleDto,
    });

    const phaseData = [
      {
        type: 'menstruation',
        startOffset: 0,
        endOffset: avgPeriodLength - 1,
      },
      {
        type: 'follicular',
        startOffset: avgPeriodLength,
        endOffset: 12,
      },
      {
        type: 'ovulation',
        startOffset: 13,
        endOffset: 13,
      },
      {
        type: 'luteal',
        startOffset: 14,
        endOffset: avgCycleLength - 1,
      },
    ];

    const phases = phaseData.map((phase) => ({
      cycle_id: cycle.id,
      type: phase.type as PhaseType,
      start_date: new Date(
        startDate.getTime() + phase.startOffset * 24 * 60 * 60 * 1000,
      ),
      end_date: new Date(
        startDate.getTime() + phase.endOffset * 24 * 60 * 60 * 1000,
      ),
    }));

    await this.prisma.phase.createMany({
      data: phases,
    });

    await this.checkAndCreateIrregularities(cycle.id);

    return this.prisma.cycle.findFirst({
      where: { id: cycle.id },
      include: { phases: true },
    });
  }

  async findAll(query: FindAllCyclesDto) {
    const { page = 1, limit = 10, user_id } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.CycleWhereInput = {
      user_id,
      ...(query.date && {
        start_date: {
          lte: new Date(query.date),
        },
      }),
    };

    const [cycles, total] = await Promise.all([
      this.prisma.cycle.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { id: 'desc' },
        include: { phases: true },
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
      where: { id, ...(user_id && { user_id }) },
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

    const updatedCycle = await this.prisma.cycle.update({
      where: { id },
      data: updateCycleDto,
    });

    //  Regenerate phases only if start_date or user_id changed
    if (updateCycleDto.start_date || updateCycleDto.user_id) {
      // Delete old phases
      await this.prisma.phase.deleteMany({
        where: { cycle_id: id },
      });

      const user = await this.usersService.findOne(updatedCycle.user_id);
      const avgCycleLength = user.avg_cycle_length || 28;
      const avgPeriodLength = user.avg_period_length || 5;

      const startDate = updatedCycle.start_date;

      const phaseData = [
        {
          type: 'menstruation',
          startOffset: 0,
          endOffset: avgPeriodLength - 1,
        },
        {
          type: 'follicular',
          startOffset: avgPeriodLength,
          endOffset: 12,
        },
        {
          type: 'ovulation',
          startOffset: 13,
          endOffset: 13,
        },
        {
          type: 'luteal',
          startOffset: 14,
          endOffset: avgCycleLength - 1,
        },
      ];

      const newPhases = phaseData.map((phase) => ({
        cycle_id: updatedCycle.id,
        type: phase.type as PhaseType,
        start_date: new Date(
          startDate.getTime() + phase.startOffset * 24 * 60 * 60 * 1000,
        ),
        end_date: new Date(
          startDate.getTime() + phase.endOffset * 24 * 60 * 60 * 1000,
        ),
      }));

      await this.prisma.phase.createMany({
        data: newPhases,
      });
    }

    return updatedCycle;
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
