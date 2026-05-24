import {
  Injectable,
  InternalServerErrorException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { TasksService } from '../tasks/tasks.service';
import { SchedulerService } from '../tasks/scheduler.service';
import { processGoogleEvent } from './utils/google-calendar.pipeline';
import { GoogleEvent } from './interfaces/google-calendar.interfaces';
import { v4 as uuidv4 } from 'uuid';

interface GoogleCalendarEventsListResponse {
  items?: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

interface GoogleWatchResponse {
  id?: string;
  resourceId?: string;
  expiration?: string | number;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => SchedulerService))
    private readonly schedulerService: SchedulerService,
  ) {}

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
    this.logger.log(
      `[GOOGLE CAL] Deleting event ${eventId} for user ${userId}`,
    );
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
      this.logger.error(
        `[GOOGLE CAL] Delete failed (${response.status}):`,
        body,
      );
      throw new InternalServerErrorException('Failed to delete Google event');
    }
  }

  /**
   * Performs an incremental (or full) sync of a user's Google Calendar.
   */
  async syncCalendar(userId: string): Promise<void> {
    this.logger.log(`Starting syncCalendar for user: ${userId}`);
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);

    const userDocRef = this.firebaseService.db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      throw new Error(`User ${userId} not found`);
    }

    const userData = userDoc.data();
    let syncToken = userData?.googleCalendarSyncToken as string | undefined;

    let nextPageToken: string | undefined;
    let newSyncToken: string | undefined;
    const itemsToProcess: GoogleEvent[] = [];

    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

    try {
      do {
        const params: Record<string, string> = {
          maxResults: '250',
        };

        if (syncToken) {
          params.syncToken = syncToken;
        } else {
          const defaultMin = new Date();
          defaultMin.setMonth(defaultMin.getMonth() - 1);
          params.timeMin = defaultMin.toISOString();
          params.singleEvents = 'true';
        }

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const url = `${baseUrl}?${new URLSearchParams(params).toString()}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        if (response.status === 410) {
          this.logger.warn(
            `Sync token expired for user ${userId}. Retrying with full sync.`,
          );
          await userDocRef.update({ googleCalendarSyncToken: null });
          syncToken = undefined;
          nextPageToken = undefined;
          continue;
        }

        if (!response.ok) {
          const body = await response.text();
          this.logger.error(`Error response from Google Calendar API: ${body}`);
          throw new InternalServerErrorException(
            'Failed to fetch from Google Calendar',
          );
        }

        const data =
          (await response.json()) as GoogleCalendarEventsListResponse;
        if (data.items && data.items.length > 0) {
          itemsToProcess.push(...data.items);
        }
        nextPageToken = data.nextPageToken;
        newSyncToken = data.nextSyncToken;
      } while (nextPageToken);

      this.logger.log(
        `Fetched ${itemsToProcess.length} events/changes to process for user ${userId}`,
      );

      for (const item of itemsToProcess) {
        const eventId = item.id || '';

        if (item.status === 'cancelled') {
          this.logger.log(
            `Sync Cancelled/Deleted Event: ${eventId} for user ${userId}`,
          );
          const existingTasks = await this.firebaseService.db
            .collection('tasks')
            .where('userId', '==', userId)
            .where('google_event_id', '==', eventId)
            .where('deletedAt', '==', null)
            .get();

          if (!existingTasks.empty) {
            for (const doc of existingTasks.docs) {
              await this.tasksService.delete(doc.id);
            }
          }
        } else {
          this.logger.log(
            `Sync Active/Updated Event: ${eventId} - "${item.summary}"`,
          );
          const processed = await processGoogleEvent(item);

          const taskData = {
            userId: userId,
            title: processed.title,
            notesEncrypted: processed.notes_encrypted || '',
            deadline: new Date(processed.deadline),
            status: 'Scheduled' as const,
            priorityLevel: processed.priority_level || 2,
            estimateTimer: processed.estimate_timer || 30,
            category: 'Meeting',
            google_event_id: processed.google_event_id,
            task_type: 'GoogleTask' as const,
            source: 'google' as const,
            estimated_start_date: new Date(processed.estimated_start_date),
            estimated_end_date: processed.estimated_end_date
              ? new Date(processed.estimated_end_date)
              : new Date(processed.deadline),
            tags: processed.tags || [],
            links: processed.links || [],
            collaborators: processed.collaborators || [],
          };

          await this.tasksService.create(taskData);
        }
      }

      if (newSyncToken) {
        await userDocRef.update({ googleCalendarSyncToken: newSyncToken });
        this.logger.log(
          `Updated syncToken to: ${newSyncToken} for user ${userId}`,
        );
      }

      await this.schedulerService.scheduleUserTasks(userId);

      // Attempt to register/update push watch channel
      await this.watchCalendar(userId);
    } catch (error) {
      this.logger.error(
        `Error in syncCalendar: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Registers a Google Calendar push watch channel.
   */
  async watchCalendar(userId: string): Promise<void> {
    try {
      const userDocRef = this.firebaseService.db
        .collection('users')
        .doc(userId);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const expiration = userData?.googleChannelExpiration as
        | number
        | undefined;

      const now = Date.now();
      // Watch if no active channel or if it is close to expiring (within 1 day)
      if (expiration && expiration - now > 24 * 60 * 60 * 1000) {
        this.logger.log(
          `Watch channel for user ${userId} is still valid until ${new Date(expiration).toISOString()}. Skipping setup.`,
        );
        return;
      }

      if (userData?.googleChannelId && userData?.googleResourceId) {
        try {
          await this.stopWatchingCalendar(userId);
        } catch (e) {
          this.logger.warn(
            `Failed to stop old watch channel: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      const { access_token } =
        await this.authService.refreshGoogleAccessToken(userId);
      const webhookUrl = this.configService.get<string>('WEBHOOK_URL');
      if (!webhookUrl) {
        this.logger.warn(
          `WEBHOOK_URL not set in environment. Cannot establish watch channel for user ${userId}.`,
        );
        return;
      }

      const channelId = uuidv4();
      const address = `${webhookUrl}/google-calendar/webhook`;
      const expirationTime = now + 7 * 24 * 60 * 60 * 1000; // 7 days

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/watch`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: channelId,
            type: 'web_hook',
            address: address,
            token: userId,
            expiration: expirationTime,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Failed to register watch channel. Status: ${response.status}. Body: ${body}`,
        );
        return;
      }

      const data = (await response.json()) as GoogleWatchResponse;
      await userDocRef.update({
        googleChannelId: data.id,
        googleResourceId: data.resourceId,
        googleChannelExpiration: Number(data.expiration) || expirationTime,
      });

      this.logger.log(
        `Watch channel registered for user ${userId}. Expires: ${new Date(Number(data.expiration) || expirationTime).toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error setting up watch channel: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Stops a Google Calendar push watch channel.
   */
  async stopWatchingCalendar(userId: string): Promise<void> {
    try {
      const userDocRef = this.firebaseService.db
        .collection('users')
        .doc(userId);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const channelId = userData?.googleChannelId as string | undefined;
      const resourceId = userData?.googleResourceId as string | undefined;

      if (!channelId || !resourceId) return;

      const { access_token } =
        await this.authService.refreshGoogleAccessToken(userId);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/channels/stop`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: channelId,
            resourceId: resourceId,
          }),
        },
      );

      if (response.ok || response.status === 404) {
        await userDocRef.update({
          googleChannelId: null,
          googleResourceId: null,
          googleChannelExpiration: null,
        });
        this.logger.log(`Stopped watching calendar for user ${userId}`);
      } else {
        const body = await response.text();
        this.logger.error(
          `Failed to stop watch channel for user ${userId}. Body: ${body}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error stopping watch channel: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
