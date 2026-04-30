import { Module } from '@nestjs/common';
import { TimeBlocksService } from './time-blocks.service';

import { TimeBlocksController } from './time-blocks.controller';

@Module({
  providers: [TimeBlocksService],
  controllers: [TimeBlocksController],
  exports: [TimeBlocksService],
})
export class TimeBlocksModule {}
