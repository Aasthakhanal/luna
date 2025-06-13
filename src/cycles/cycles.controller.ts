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
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { JwtPayload } from 'src/interfaces/jwt-payload';
import { FindAllCyclesDto } from './dto/find-all-cycles.dto';

@Controller('cycles')
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Post()
  create(@Req() request: JwtPayload, @Body() createCycleDto: CreateCycleDto) {
    createCycleDto.user_id = request.payload.user_id; // Set the user_id from the JWT payload
    console.log(request);
    return this.cyclesService.create(createCycleDto);
  }

  @Get()
  findAll(@Req() request: JwtPayload, @Query() query: FindAllCyclesDto) {
    if (request.payload.user_id) {
      query.user_id = request.payload.user_id;
    }
    return this.cyclesService.findAll(query);
  }

  @Get(':id')
  findOne(@Req() request: JwtPayload, @Param('id') id: string) {
    return this.cyclesService.findOne(+id, request.payload.user_id);
  }

  @Patch(':id')
  update(
    @Req() request: JwtPayload,
    @Param('id') id: string,
    @Body() updateCycleDto: UpdateCycleDto,
  ) {
    updateCycleDto.user_id = request.payload.user_id;
    return this.cyclesService.update(+id, updateCycleDto);
  }

  @Delete(':id')
  remove(@Req() request: JwtPayload, @Param('id') id: string) {
    const user_id = request.payload.user_id;
    return this.cyclesService.remove(+id, user_id);
  }
}
