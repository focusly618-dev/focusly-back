import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class AuthResponse {
  @Field()
  access_token: string;

  @Field(() => User)
  user: User;

  @Field({ nullable: true })
  google_access_token?: string;
}
