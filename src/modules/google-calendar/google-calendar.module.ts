import { Module, forwardRef } from '@nestjs/common';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarWebhookController } from './google-calendar-webhook.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthModule } from '../auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { TimeBlocksModule } from '../time-blocks/time-blocks.module';

@Module({
  imports: [AuthModule, forwardRef(() => TasksModule), TimeBlocksModule],
  controllers: [GoogleCalendarController, GoogleCalendarWebhookController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
