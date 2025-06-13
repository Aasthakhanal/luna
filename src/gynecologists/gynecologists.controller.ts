import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { GynecologistsService } from './gynecologists.service';
import { CreateGynecologistDto } from './dto/create-gynecologist.dto';
import { UpdateGynecologistDto } from './dto/update-gynecologist.dto';
import { FindAllGynecologistsDto } from './dto/find-all-gynecologists.dto';

@Controller('gynecologists')
export class GynecologistsController {
  constructor(private readonly gynecologistsService: GynecologistsService) {}

  @Post()
  create(
    @Body() createGynecologistDto: CreateGynecologistDto,
  ) {
    return this.gynecologistsService.create(createGynecologistDto);
  }

  @Get()
  findAll(@Query() query: FindAllGynecologistsDto) {
    return this.gynecologistsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gynecologistsService.findOne(+id);
  }
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateGynecologistDto: UpdateGynecologistDto,
  ) {
    return this.gynecologistsService.update(+id, updateGynecologistDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gynecologistsService.remove(+id);
  }
}
