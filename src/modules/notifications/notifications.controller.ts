import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { INotification } from './interfaces/notification.interface';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async create(@Body() createDto: CreateNotificationDto): Promise<string> {
    return this.notificationsService.create({
      ...createDto,
      scheduledAt: new Date(createDto.scheduledAt),
    } as Partial<INotification>);
  }

  @Get()
  async findAll(): Promise<INotification[]> {
    return this.notificationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<INotification> {
    return this.notificationsService.findOne(id);
  }
}
