import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksResolver } from './tasks.resolver';
import { TagsModule } from '../tags/tags.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [
    TagsModule,
    forwardRef(() => WorkspacesModule),
    GoogleCalendarModule,
  ],
  providers: [TasksService, TasksResolver],
  exports: [TasksService],
})
export class TasksModule {}
