import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsResolver } from './insights.resolver';
import { TasksModule } from '../tasks/tasks.module';
import { FocusSessionsModule } from '../focus-sessions/focus-sessions.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [TasksModule, FocusSessionsModule, UsersModule],
    providers: [InsightsService, InsightsResolver],
})
export class InsightsModule { }
