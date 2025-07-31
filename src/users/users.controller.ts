import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import PaginatedResponse from 'src/interfaces/pagination';
import { User } from './entities/user.entity';
import { JwtPayload } from 'src/interfaces/jwt-payload';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: FindAllUsersDto): Promise<PaginatedResponse<User>> {
    return this.usersService.findAll(query);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
  // @Patch('fcm-token')
  // updateFcmToken( @Req() request: JwtPayload, @Body() updateUserDto: UpdateUserDto) {
  //  createUserDto.id = request.payload.id; 
  //   return this.userService.updateFcmToken(userId, updateUserDto.fcm_token);
  // }
}
