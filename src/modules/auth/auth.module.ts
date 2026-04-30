import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthResolver } from './auth.resolver';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error(
            'FATAL ERROR: JWT_SECRET environment variable is not defined',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: '7d', algorithm: 'HS256' as const },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthResolver],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
