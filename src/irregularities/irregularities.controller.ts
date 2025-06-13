import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { IrregularitiesService } from './irregularities.service';
import { CreateIrregularityDto } from './dto/create-irregularity.dto';
import { UpdateIrregularityDto } from './dto/update-irregularity.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload';
import { FindAllIrregularitiesDto } from './dto/find-all-irregularities.dto';

@Controller('irregularities')
export class IrregularitiesController {
  constructor(private readonly irregularitiesService: IrregularitiesService) {}

  @Post()
  create(
    @Req() request: JwtPayload,
    @Body() createIrregularityDto: CreateIrregularityDto,
  ) {
    createIrregularityDto.user_id = request.payload.user_id;
    return this.irregularitiesService.create(createIrregularityDto);
  }

  @Get()
  findAll(
    @Req() request: JwtPayload,
    @Query() query: FindAllIrregularitiesDto,
  ) {
    query.user_id = request.payload.user_id;
    return this.irregularitiesService.findAll(query);
  }

  @Get(':id')
  findOne(@Req() request: JwtPayload, @Param('id') id: string) {
    let userId: number | undefined;
    if (request.payload.user_id) {
      userId = request.payload.user_id;
      return this.irregularitiesService.findOne(+id, userId);
    }
  }
  @Patch(':id')
  update(
    @Req() request: JwtPayload,
    @Param('id') id: string,
    @Body() updateIrregularityDto: UpdateIrregularityDto,
  ) {
    updateIrregularityDto.user_id = request.payload.user_id;
    return this.irregularitiesService.update(+id, updateIrregularityDto);
  }

  @Delete(':id')
  remove(@Req() request: JwtPayload, @Param('id') id: string) {
    const user_id = request.payload.user_id;
    return this.irregularitiesService.remove(+id, user_id);
  }
}
