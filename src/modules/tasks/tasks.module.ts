import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksResolver } from './tasks.resolver';
import { SchedulerService } from './scheduler.service';
import { TagsModule } from '../tags/tags.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { TimeBlocksModule } from '../time-blocks/time-blocks.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [
    TagsModule,
    forwardRef(() => WorkspacesModule),
    GoogleCalendarModule,
    TimeBlocksModule,
    SchedulingModule,
  ],
  providers: [TasksService, TasksResolver, SchedulerService],
  exports: [TasksService, SchedulerService],
})
export class TasksModule {}
