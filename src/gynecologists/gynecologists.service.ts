import { Injectable } from '@nestjs/common';
import { CreateGynecologistDto } from './dto/create-gynecologist.dto';
import { UpdateGynecologistDto } from './dto/update-gynecologist.dto';
import { FindAllGynecologistsDto } from './dto/find-all-gynecologists.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class GynecologistsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createGynecologistsDto: CreateGynecologistDto) {
    return await this.prisma.gynecologist.create({
      data: createGynecologistsDto,
    });
  }

  async findAll(query: FindAllGynecologistsDto) {
    const { page = 1, limit = 10, latitude, longitude, distance = 10 } = query;
    const skip = (page - 1) * limit;
    console.log(latitude, 'latitude');
    console.log(longitude, 'longitude');

    if (latitude && longitude) {
      const nearbyGynecologists = await this.prisma.$queryRawUnsafe<any[]>(
        `
        SELECT *, (
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(latitude))
          )
        ) AS distance_km
        FROM "Gynecologist"
        HAVING distance_km <= ${distance}
        ORDER BY distance_km ASC
        OFFSET ${skip}
        LIMIT ${limit};
        `,
      );

      const countResult = await this.prisma.$queryRawUnsafe<any[]>(
        `
        SELECT COUNT(*) as total
        FROM (
          SELECT (
            6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians(${longitude})) + 
              sin(radians(${latitude})) * 
              sin(radians(latitude))
            )
          ) AS distance_km
          FROM "Gynecologist"
        ) AS subquery
        WHERE distance_km <= ${distance};
        `,
      );


      const total = Number(countResult[0]?.total || 0);

      return {
        data: nearbyGynecologists,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // If no location-based filtering
    const [gynecologists, total] = await Promise.all([
      this.prisma.gynecologist.findMany({
        skip,
        take: +limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.gynecologist.count(),
    ]);

    return {
      data: gynecologists,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const gynecologist = await this.prisma.gynecologist.findFirst({
      where: { id },
    });
    if (!gynecologist) {
      throw new Error(`Gynecologist with id ${id} not found`);
    }
    return gynecologist;
  }

  async update(id: number, updateGynecologistDto: UpdateGynecologistDto) {
    await this.findOne(id);
    return await this.prisma.gynecologist.update({
      where: { id },
      data: updateGynecologistDto,
    });
  }

  async remove(id: number ) {
    await this.findOne(id );
    return this.prisma.gynecologist.delete({
      where: { id },
    });
  }
}
