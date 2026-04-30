import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsCronService } from './notifications-cron.service';
import { NotificationsController } from './notifications.controller';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TasksModule, UsersModule],
  providers: [NotificationsCronService, NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
