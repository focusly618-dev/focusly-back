import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response.dto';
import { Public } from './public.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Mutation(() => AuthResponse)
  async googleLogin(@Args('code') code: string): Promise<AuthResponse> {
    return this.authService.validateGoogleToken(code);
  }

  @Public()
  @Mutation(() => AuthResponse)
  async firebaseLogin(
    @Args('token') token: string,
    @Args('fullName') fullName: string,
  ): Promise<AuthResponse> {
    return this.authService.validateFirebaseToken(token, fullName);
  }
}
