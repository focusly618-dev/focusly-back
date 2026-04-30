import { Resolver, Query, Args } from '@nestjs/graphql';
import { InsightsService } from './insights.service';
import { InsightsResponse } from './schemas/insights.schema';

@Resolver(() => InsightsResponse)
export class InsightsResolver {
  constructor(private readonly insightsService: InsightsService) {}

  @Query(() => InsightsResponse)
  async getInsights(
    @Args('userId') userId: string,
    @Args('filter', { defaultValue: 'Weekly' }) filter: string,
  ): Promise<InsightsResponse> {
    return this.insightsService.getInsights(userId, filter);
  }
}
