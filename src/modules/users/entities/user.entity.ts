import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserSettings {
  @Field({ nullable: true })
  focusDurationPref?: number;

  @Field({ nullable: true })
  breakDurationPref?: number;

  @Field({ nullable: true })
  notificationsEnabled?: boolean;
}

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  picture?: string;

  @Field({ nullable: true })
  role?: string;

  @Field({ nullable: true })
  authProvider?: string;

  @Field({ nullable: true })
  googleRefreshToken?: string;

  @Field()
  subscriptionStatus: string;

  @Field(() => UserSettings, { nullable: true })
  settings?: UserSettings;

  @Field({ nullable: true })
  bio?: string;
}
