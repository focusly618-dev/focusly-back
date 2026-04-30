import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { ITag } from './interfaces/tag.interface';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  async create(@Body() createDto: CreateTagDto): Promise<string> {
    return this.tagsService.create(createDto);
  }

  @Get()
  async findAll(): Promise<ITag[]> {
    return this.tagsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ITag> {
    return this.tagsService.findOne(id);
  }

  @Get(':userId')
  async findAllByUser(@Param('userId') userId: string): Promise<ITag[]> {
    return this.tagsService.findAllByUser(userId);
  }
}
