import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TimeBlocksService } from './time-blocks.service';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { ITimeBlock } from './interfaces/time-block.interface';

@Controller('time-blocks')
export class TimeBlocksController {
  constructor(private readonly timeBlocksService: TimeBlocksService) {}

  @Post()
  async create(@Body() createDto: CreateTimeBlockDto): Promise<string> {
    return this.timeBlocksService.create({
      ...createDto,
      startTime: new Date(createDto.startTime),
      endTime: new Date(createDto.endTime),
    } as Partial<ITimeBlock>);
  }

  @Get()
  async findAll(): Promise<ITimeBlock[]> {
    return this.timeBlocksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ITimeBlock> {
    return this.timeBlocksService.findOne(id);
  }
}
