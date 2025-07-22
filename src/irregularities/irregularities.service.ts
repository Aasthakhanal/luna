import { Injectable } from '@nestjs/common';
import { CreateIrregularityDto } from './dto/create-irregularity.dto';
import { UpdateIrregularityDto } from './dto/update-irregularity.dto';
import { CyclesService } from 'src/cycles/cycles.service';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FindAllIrregularitiesDto } from './dto/find-all-irregularities.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class IrregularitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly usersService: UsersService,
  ) {}
  async create(createIrregularityDto: CreateIrregularityDto) {
    await this.cyclesService.findOne(createIrregularityDto.cycle_id);
    await this.usersService.findOne(createIrregularityDto.user_id);
    return await this.prisma.irregularity.create({
      data: createIrregularityDto,
    });
  }

  async findAll(query: FindAllIrregularitiesDto) {
    const { page = 1, limit = 10, search, user_id } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.IrregularityWhereInput = {
      user_id
    }
    const [irregularities, total] = await Promise.all([
      this.prisma.irregularity.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.irregularity.count({}),
    ]);
    return {
      data: irregularities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, user_id: number | undefined, cycle_id?: number) {
    const irregularity = await this.prisma.irregularity.findUnique({
      where: { id, user_id, cycle_id},
    });
    if (!irregularity) {
      throw new Error(`Irregularity with id ${id} not found`);
    }
    return irregularity;
  }

  async update(id: number, updateIrregularityDto: UpdateIrregularityDto) {
    await this.findOne(id, updateIrregularityDto.user_id);
    if (updateIrregularityDto.cycle_id) {
      await this.cyclesService.findOne(updateIrregularityDto.cycle_id);
    }
    if (updateIrregularityDto.user_id) {
      await this.usersService.findOne(updateIrregularityDto.user_id);
    }
    return await this.prisma.irregularity.update({
      where: { id },
      data: updateIrregularityDto,
    });
  }

  async remove(id: number, user_id: number) {
    await this.findOne(id, user_id);
    return this.prisma.irregularity.delete({
      where: { id },
    });
  }
}
