import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Tag } from './entities/tag.entity';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { ITag } from './interfaces/tag.interface';

@Resolver(() => Tag)
@UseGuards(GqlAuthGuard)
export class TagsResolver {
  constructor(private readonly tagsService: TagsService) {}

  @Query(() => [Tag])
  async getTagsByUser(@Args('userId') userId: string): Promise<ITag[]> {
    return this.tagsService.findAllByUser(userId);
  }
}
