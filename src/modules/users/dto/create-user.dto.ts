import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsString,
  IsObject,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class UserSettingsDto {
  @IsObject()
  @IsNotEmpty()
  workHoursConfig: Record<string, any>;

  @IsString({ each: true })
  blockedAppsList: string[];

  @IsNumber()
  focusDurationPref: number;

  @IsNumber()
  breakDurationPref: number;

  @IsBoolean()
  notificationsEnabled: boolean;
}

export class CreateUserDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;

  @IsString()
  @IsNotEmpty()
  authProvider: string;

  @IsString()
  @IsNotEmpty()
  subscriptionStatus: string;

  @IsObject()
  @ValidateNested()
  @Type(() => UserSettingsDto)
  settings: UserSettingsDto;
}
