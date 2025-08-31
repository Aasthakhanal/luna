import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { FindAllCyclesDto } from './dto/find-all-cycles.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { differenceInDays } from 'date-fns';
import { PhaseType, Prisma } from '@prisma/client';

@Injectable()
export class CyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
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
      menstruationEnd.setDate(menstruationEnd.getDate() + avgPeriodLength + 5);

      if (startDate >= menstruationStart && startDate <= menstruationEnd) {
        throw new BadRequestException(
          `Cannot create a new cycle. The selected start date falls within the menstruation phase (${menstruationStart.toDateString()} – ${menstruationEnd.toDateString()}) of an existing cycle this month.`,
        );
      }
    }

    // Prevent creating a cycle if there is a previous cycle within 10 days before
    const previousCycle10 = await this.prisma.cycle.findFirst({
      where: {
        user_id: createCycleDto.user_id,
        start_date: {
          lt: startDate,
          gte: new Date(startDate.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { start_date: 'desc' },
    });
    if (previousCycle10) {
      throw new BadRequestException(
        `Cannot create a new cycle. There is already a cycle started within 10 days before the selected start date (${previousCycle10.start_date.toDateString()}).`,
      );
    }

    // Prevent creating a cycle if there is a next cycle within 10 days after
    const nextCycle10 = await this.prisma.cycle.findFirst({
      where: {
        user_id: createCycleDto.user_id,
        start_date: {
          gt: startDate,
          lte: new Date(startDate.getTime() + 10 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { start_date: 'asc' },
    });
    if (nextCycle10) {
      throw new BadRequestException(
        `Cannot create a new cycle. There is already a cycle started within 10 days after the selected start date (${nextCycle10.start_date.toDateString()}).`,
      );
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
    // 1. Fetch all previous start dates for the user before this one
    const previousCycles = await this.prisma.cycle.findMany({
      where: {
        user_id: createCycleDto.user_id,
        start_date: {
          lt: startDate,
        },
      },
      orderBy: {
        start_date: 'asc',
      },
      select: { start_date: true },
    });

    // 2. Apply Moving Average Algorithm
    let predictedEndDate: Date | null = null;
    if (previousCycles.length >= 2) {
      const startDates = previousCycles.map((c) => new Date(c.start_date));
      const cycleLengths: number[] = [];

      for (let i = 1; i < startDates.length; i++) {
        const diff = differenceInDays(startDates[i], startDates[i - 1]);
        cycleLengths.push(diff);
      }
      const averageLength = Math.round(
        cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length,
      );
      predictedEndDate = new Date(startDate);
      predictedEndDate.setDate(predictedEndDate.getDate() + averageLength - 1);
    } else {
      // Fallback to user's avg cycle length
      predictedEndDate = new Date(startDate);
      predictedEndDate.setDate(predictedEndDate.getDate() + avgCycleLength - 1);
    }

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

    // Check irregularities for the previous cycle (not the current one being created)
    await this.checkAndCreateIrregularities(createCycleDto.user_id, startDate);

    // Check all notification conditions after cycle creation
    try {
      await this.notificationsService.checkAllNotificationConditions(
        createCycleDto.user_id,
      );
      console.log(
        `✅ Notification check completed for user ${createCycleDto.user_id} after cycle creation`,
      );
    } catch (error) {
      console.error(
        '❌ Error checking notifications after cycle creation:',
        error,
      );
    }

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

      // --- Moving Average Prediction Logic ---
      const previousCycles = await this.prisma.cycle.findMany({
        where: {
          user_id: updateCycleDto.user_id,
          start_date: {
            lt: updateCycleDto.start_date,
          },
        },
        orderBy: { start_date: 'asc' },
        select: { start_date: true },
      });

      let predictedEndDate: Date | null = null;

      if (previousCycles.length >= 2) {
        const startDates = previousCycles.map((c) => new Date(c.start_date));
        const cycleLengths: number[] = [];

        for (let i = 1; i < startDates.length; i++) {
          const diff = differenceInDays(startDates[i], startDates[i - 1]);
          cycleLengths.push(diff);
        }

        const averageLength = Math.round(
          cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length,
        );

        predictedEndDate = new Date(updateCycleDto.start_date);
        predictedEndDate.setDate(
          predictedEndDate.getDate() + averageLength - 1,
        );
      } else {
        if (!updateCycleDto.user_id) {
          throw new Error('user_id is required to update cycle');
        }
        const user = await this.usersService.findOne(updateCycleDto.user_id);
        const avgCycleLength = user.avg_cycle_length || 28;

        predictedEndDate = new Date(updateCycleDto.start_date);
        predictedEndDate.setDate(
          predictedEndDate.getDate() + avgCycleLength - 1,
        );
      }

      updateCycleDto.predicted_start_date = updateCycleDto.start_date;
      updateCycleDto.predicted_end_date = predictedEndDate;
    }

    if (updateCycleDto.end_date) {
      updateCycleDto.end_date = new Date(updateCycleDto.end_date);
    }

    const updatedCycle = await this.prisma.cycle.update({
      where: { id },
      data: updateCycleDto,
    });

    // Regenerate phases only if start_date or user_id changed
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

    // Check all notification conditions after cycle update
    try {
      await this.notificationsService.checkAllNotificationConditions(
        updatedCycle.user_id,
      );
      console.log(
        `✅ Notification check completed for user ${updatedCycle.user_id} after cycle update`,
      );
    } catch (error) {
      console.error(
        '❌ Error checking notifications after cycle update:',
        error,
      );
    }

    return updatedCycle;
  }

  async remove(id: number, user_id: number) {
    await this.findOne(id, user_id);
    return this.prisma.cycle.delete({
      where: { id },
    });
  }
  private async checkAndCreateIrregularities(
    userId: number,
    currentCycleStartDate: Date,
  ) {
    // Find the most recently created cycle before the current one
    const previousCycle = await this.prisma.cycle.findFirst({
      where: {
        user_id: userId,
        start_date: {
          lt: currentCycleStartDate,
        },
      },
      orderBy: { start_date: 'desc' },
      include: { period_days: true },
    });

    if (!previousCycle) {
      console.log('No previous cycle found for irregularity check');
      return;
    }

    const irregularities: ('short_cycle' | 'long_cycle' | 'missed_period')[] =
      [];

    // Check for short/long cycle
    if (previousCycle.end_date) {
      const length = differenceInDays(
        new Date(previousCycle.end_date),
        new Date(previousCycle.start_date),
      );
      if (length < 21) irregularities.push('short_cycle');
      else if (length > 35) irregularities.push('long_cycle');
    }

    // Check for missed period
    if (!previousCycle.end_date) {
      const daysSinceStart = differenceInDays(
        currentCycleStartDate, // Use current cycle start date as reference
        new Date(previousCycle.start_date),
      );
      if (daysSinceStart > 45) irregularities.push('missed_period');
    }

    // Save irregularities for the previous cycle
    for (const type of irregularities) {
      const existing = await this.prisma.irregularity.findFirst({
        where: {
          cycle_id: previousCycle.id,
          irregularity_type: type,
        },
      });

      if (!existing) {
        await this.prisma.irregularity.create({
          data: {
            user_id: previousCycle.user_id,
            cycle_id: previousCycle.id,
            irregularity_type: type,
          },
        });
        console.log(
          `Created irregularity: ${type} for cycle ${previousCycle.id}`,
        );
      }
    }
  }
}
