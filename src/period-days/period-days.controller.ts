import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query } from '@nestjs/common';
import { PeriodDaysService } from './period-days.service';
import { CreatePeriodDayDto } from './dto/create-period-day.dto';
import { UpdatePeriodDayDto } from './dto/update-period-day.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload';
import { FindAllPeriodDaysDto } from './dto/find-all-period-days.dto';

@Controller('period-days')
export class PeriodDaysController {
  constructor(private readonly periodDaysService: PeriodDaysService) {}

  @Post()
  create(@Req() request: JwtPayload,@Body() createPeriodDayDto: CreatePeriodDayDto) {
    createPeriodDayDto.user_id = request.payload.user_id;
    return this.periodDaysService.create(createPeriodDayDto);
  }

 @Get()
  findAll(
    @Req() request: JwtPayload,
    @Query() query: FindAllPeriodDaysDto,
  ) {
    if (request.payload.user_id){
      query.user_id = request.payload.user_id;

    }
    return this.periodDaysService.findAll(query);
  }

  @Get(':id')
  findOne(@Req() request: JwtPayload,@Param('id') id: string) {
    return this.periodDaysService.findOne(+id, request.payload.user_id);
  }

  @Patch(':id')
  update(@Req() request: JwtPayload,@Param('id') id: string, @Body() updatePeriodDayDto: UpdatePeriodDayDto) {
    updatePeriodDayDto.user_id = request.payload.user_id;
    return this.periodDaysService.update(+id, updatePeriodDayDto);
  }

  @Delete(':id')
  remove(@Req() request: JwtPayload,@Param('id') id: string) {
    const user_id = request.payload.user_id;
    return this.periodDaysService.remove(+id, user_id);
  }
}
