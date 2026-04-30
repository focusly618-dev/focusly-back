import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser } from './interfaces/user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<IUser> {
    const id = uuidv4();
    return this.usersService.create({ ...createUserDto, id });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IUser> {
    return this.usersService.findOne(id);
  }
  @Get()
  async findAll(): Promise<IUser[]> {
    return this.usersService.find();
  }
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<IUser> {
    return this.usersService.update(id, updateUserDto);
  }
}
