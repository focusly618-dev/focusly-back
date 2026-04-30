import {
  Body,
  Controller,
  Post,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import type { Response } from 'express';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  async googleLogin(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.validateGoogleToken(code);

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const cleanResult = { ...result } as Record<string, unknown>;
    delete cleanResult['access_token'];
    delete cleanResult['refresh_token'];
    delete cleanResult['google_access_token'];
    return cleanResult;
  }

  @Post('login')
  async firebaseLogin(
    @Body() body: { token: string; fullName: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.validateFirebaseToken(
      body.token,
      body.fullName,
    );

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const cleanResult = { ...result } as Record<string, unknown>;

    delete cleanResult['access_token'];
    delete cleanResult['refresh_token'];
    return cleanResult;
  }

  @Post('refresh')
  async refresh(
    @Body('userId') userId: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const user = await this.authService.refreshSession(userId);
    const result = this.authService.generateJwt(user);

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { success: true };
  }

  @Post('google/refresh')
  async refreshGoogleToken(@Body('userId') userId: string) {
    return this.authService.refreshGoogleAccessToken(userId);
  }

  @Post('logout')
  @Public()
  // eslint-disable-next-line @typescript-eslint/require-await
  async logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: new Date(0),
    });
    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: new Date(0),
    });
    return { message: 'Logged out successfully' };
  }
}
