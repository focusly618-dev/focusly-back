export interface IUserSettings {
  workHoursConfig: Record<string, any>;
  focusDurationPref: number;
  breakDurationPref: number;
  notificationsEnabled: boolean;
}

export interface IUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  role?: string;
  bio?: string;
  passwordHash?: string;
  authProvider?: string;
  googleRefreshToken?: string;
  subscriptionStatus: string;
  settings?: IUserSettings;
  externalId?: string;
  fcmToken?: string;
}
