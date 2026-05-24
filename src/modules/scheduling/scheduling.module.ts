import { Module } from '@nestjs/common';
import { SchedulerService } from './services/scheduler.service';
import { MigrationService } from './services/migration.service';

@Module({
  providers: [SchedulerService, MigrationService],
  exports: [SchedulerService, MigrationService],
})
export class SchedulingModule {}
