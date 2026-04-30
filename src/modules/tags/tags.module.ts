import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';

import { TagsController } from './tags.controller';

import { TagsResolver } from './tags.resolver';

@Module({
  providers: [TagsService, TagsResolver],
  controllers: [TagsController],
  exports: [TagsService],
})
export class TagsModule {}
