import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class GoogleCalendarService {
  constructor(private readonly authService: AuthService) {}

  async getEvents(userId: string, timeMin?: string, timeMax?: string) {
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);

    const params: Record<string, string> = {
      maxResults: '2500',
      singleEvents: 'true',
      orderBy: 'startTime',
    };

    if (timeMin) {
      params.timeMin = timeMin;
    } else {
      // Default to 1 month ago if no date provided
      const defaultMin = new Date();
      defaultMin.setMonth(defaultMin.getMonth() - 1);
      params.timeMin = defaultMin.toISOString();
    }

    if (timeMax) {
      params.timeMax = timeMax;
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${new URLSearchParams(
        params,
      ).toString()}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );
    if (!response.ok)
      throw new InternalServerErrorException('Failed to fetch from Google');
    return response.json() as Promise<unknown>;
  }

  async createEvent(userId: string, event: any) {
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );
    if (!response.ok)
      throw new InternalServerErrorException('Failed to create Google event');
    return response.json() as Promise<unknown>;
  }

  async patchEvent(userId: string, eventId: string, event: any) {
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );
    if (!response.ok)
      throw new InternalServerErrorException('Failed to patch Google event');
    return response.json() as Promise<unknown>;
  }

  async deleteEvent(userId: string, eventId: string) {
    console.log(`[GOOGLE CAL] Deleting event ${eventId} for user ${userId}`);
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      console.error(`[GOOGLE CAL] Delete failed (${response.status}):`, body);
      throw new InternalServerErrorException('Failed to delete Google event');
    }
  }
}
