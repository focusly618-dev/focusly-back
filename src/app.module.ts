import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './modules/auth/gql-throttler.guard';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TagsModule } from './modules/tags/tags.module';
import { TimeBlocksModule } from './modules/time-blocks/time-blocks.module';
import { FocusSessionsModule } from './modules/focus-sessions/focus-sessions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { InsightsModule } from './modules/insights/insights.module';
import { FoldersModule } from './modules/folders/folders.module';
import { GoogleCalendarModule } from './modules/google-calendar/google-calendar.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      context: ({ req, res }: { req: any; res: any }) => ({ req, res }),
    }),
    FirebaseModule,
    UsersModule,
    TasksModule,
    TagsModule,
    TimeBlocksModule,
    FocusSessionsModule,
    NotificationsModule,
    AuthModule,
    WorkspacesModule,
    InsightsModule,
    FoldersModule,
    GoogleCalendarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
