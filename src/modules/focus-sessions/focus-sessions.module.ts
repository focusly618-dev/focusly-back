import { Module } from '@nestjs/common';
import { FocusSessionsService } from './focus-sessions.service';

import { FocusSessionsController } from './focus-sessions.controller';

@Module({
  providers: [FocusSessionsService],
  controllers: [FocusSessionsController],
  exports: [FocusSessionsService],
})
export class FocusSessionsModule {}
