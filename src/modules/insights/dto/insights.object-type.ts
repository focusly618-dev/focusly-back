import { Field, Float, ObjectType, Int } from '@nestjs/graphql';

@ObjectType()
export class StatCardValue {
  @Field()
  value: string;

  @Field()
  change: string; // e.g., "+12% vs last week" or "+2 pts"

  @Field()
  trend: 'up' | 'down' | 'neutral';
}

@ObjectType()
export class ProductivityTrend {
  @Field()
  day: string; // "MON", "TUE"

  @Field(() => Float)
  actual: number;

  @Field(() => Float)
  planned: number;
}

@ObjectType()
export class TimeDistribution {
  @Field()
  name: string; // "Deep Work", "Meetings"

  @Field(() => Float)
  value: number; // Percentage or raw count

  @Field()
  color: string;
}

@ObjectType()
export class GoldenHour {
  @Field()
  startHour: number;

  @Field()
  endHour: number;

  @Field()
  frequency: number;
}

@ObjectType()
export class InsightsResponse {
  @Field(() => StatCardValue)
  totalFocusHours: StatCardValue;

  @Field(() => StatCardValue)
  taskCompletion: StatCardValue;

  @Field(() => StatCardValue)
  energyScore: StatCardValue;

  @Field(() => StatCardValue)
  goldenWindow: StatCardValue;

  @Field(() => [ProductivityTrend])
  productivityTrends: ProductivityTrend[];

  @Field(() => [TimeDistribution])
  timeDistribution: TimeDistribution[];

  @Field(() => [Int])
  heatmap: number[];
}
