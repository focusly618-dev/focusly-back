/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { IUser } from '../users/interfaces/user.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error(
        'Google Client ID or Secret is not defined in environment variables',
      );
    }

    const redirectUri =
      this.configService.get<string>('GOOGLE_REDIRECT_URI') || 'postmessage';
    this.googleClient = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  async validateFirebaseToken(idToken: string, fullName: string) {
    try {
      const decodedToken =
        await this.firebaseService.auth.verifyIdToken(idToken);

      const { email } = decodedToken;

      if (!email) throw new UnauthorizedException('Email not found in token');

      let user = await this.usersService.findByEmail(email);

      if (!user) {
        const id = uuidv4();

        user = await this.usersService.create({
          id,
          email,
          name: fullName,
          authProvider: 'firebase',
          role: 'user',
          subscriptionStatus: 'free',
        });
      }
      return this.generateJwt(user);
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Invalid Firebase Token');
    }
  }

  async validateGoogleToken(code: string) {
    try {
      // Intercambiar el código por tokens (access_token + refresh_token)
      const { tokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(tokens);

      const userInfoResponse = await this.googleClient.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo',
      });

      const payload = userInfoResponse.data as any;

      if (!payload) {
        throw new UnauthorizedException('Invalid Google User Info');
      }

      const { email, name, picture } = payload;

      if (!email) {
        throw new UnauthorizedException(
          'Email no encontrado en el usuario de Google',
        );
      }

      // 2. Buscar en Base de Datos
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      let user = await this.usersService.findByEmail(email);

      if (!user) {
        const id = uuidv4();
        user = await this.usersService.create({
          id,
          email,
          name,
          picture,
          authProvider: 'google',
          role: 'user',
          subscriptionStatus: 'free',
          googleRefreshToken: tokens.refresh_token || undefined, // Guardamos el refresh token si es nuevo
        });
      } else if (tokens.refresh_token) {
        await this.usersService.updateGoogleRefreshToken(
          user.id,
          tokens.refresh_token,
        );
        user.googleRefreshToken = tokens.refresh_token;
      }

      // 3. Generar TU propio JWT
      // 3. Generar TU propio JWT
      return {
        ...this.generateJwt(user),
        google_access_token: tokens.access_token || undefined,
      };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException(
        'Token de Google inválido o error al obtener usuario',
      );
    }
  }

  async refreshGoogleAccessToken(userId: string) {
    try {
      const user = await this.usersService.findOne(userId);

      if (!user || !user.googleRefreshToken) {
        throw new UnauthorizedException('No valid refresh token found');
      }

      this.googleClient.setCredentials({
        refresh_token: user.googleRefreshToken,
      });

      const { credentials } = await this.googleClient.refreshAccessToken();

      return {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      };
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      throw new UnauthorizedException('Failed to refresh Google token');
    }
  }

  async refreshSession(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  generateJwt(user: IUser) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    // Access token: 15 minutes
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    // Refresh token: 7 days
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      access_token,
      refresh_token,
      user,
    };
  }
}
