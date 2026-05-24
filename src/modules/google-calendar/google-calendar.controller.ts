import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { processGoogleEvent } from './utils/google-calendar.pipeline';
import { TasksService } from '../tasks/tasks.service';
import { Inject, forwardRef } from '@nestjs/common';
import { GoogleEvent } from './interfaces/google-calendar.interfaces';
import { TimeBlocksService } from '../time-blocks/time-blocks.service';
import { SchedulerService } from '../tasks/scheduler.service';

/**
 * Normalizes a Google Event ID by removing leading underscores.
 * Matches the logic used in the frontend mapper.
 */
const normalizeId = (id: string | null | undefined): string => {
  if (!id) return '';
  return id.replace(/^_+/, '');
};

const getBaseId = (id: string | null | undefined): string => {
  if (!id) return '';
  return normalizeId(id).split('_')[0];
};

@Controller('google-calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    private readonly timeBlocksService: TimeBlocksService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @Get('events')
  async getEvents(
    @Request() req: any,
    @Query('timeMin') timeMin?: string,
    @Query('timeMax') timeMax?: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    const rawData = (await this.googleCalendarService.getEvents(
      userId,
      timeMin,
      timeMax,
    )) as {
      items?: GoogleEvent[];
    };

    if (!rawData.items) return [];

    // 1. Get already synced Google Event IDs from the database (now from time_blocks collection)
    const syncedIds = await this.timeBlocksService.getSyncedGoogleIds(userId);
    const normalizedSyncedIds = new Set(syncedIds.map((id) => normalizeId(id)));

    // 2. Filter out events that already exist in our DB
    const filteredItems = rawData.items.filter((item) => {
      const normalizedEventId = normalizeId(item.id);
      const baseEventId = getBaseId(item.id);
      return (
        !normalizedSyncedIds.has(normalizedEventId) &&
        !normalizedSyncedIds.has(baseEventId)
      );
    });

    // 3. Process the remaining events through the pipeline
    const processedEvents = await Promise.all(
      filteredItems.map((event) => processGoogleEvent(event)),
    );

    // 4. Automatically save them to the time_blocks collection
    const timeBlocksToSave = processedEvents.map((event) => {
      const isMeeting =
        (event.links &&
          event.links.some(
            (l) =>
              l.url.includes('meet.google.com') ||
              l.url.includes('zoom.us') ||
              l.url.includes('teams.microsoft.com'),
          )) ||
        (event.collaborators && event.collaborators.length > 1);

      return {
        userId,
        title: event.title,
        startTime: new Date(event.estimated_start_date),
        endTime: new Date(event.deadline),
        blockType: isMeeting ? 'Meeting' : 'External_Event',
        externalEventId: event.google_event_id,
        source: 'Google' as const,
        isLocked: true,
        meetingUrl:
          event.links && event.links.length > 0
            ? event.links[0].url
            : undefined,
        attendees: event.collaborators?.map((c) => ({
          email: c.email,
          responseStatus: c.responseStatus,
          name: c.name || '',
        })),
      };
    });

    if (timeBlocksToSave.length > 0) {
      await this.timeBlocksService.createMany(timeBlocksToSave);

      // Trigger backend scheduler to recalculate optimal task allocations around the new calendar blocks
      await this.schedulerService.scheduleUserTasks(userId);
    }

    return processedEvents;
  }

  @Post('events')
  async createEvent(@Request() req: any, @Body() event: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    return (await this.googleCalendarService.createEvent(
      userId,
      event,
    )) as Promise<unknown>;
  }

  @Patch('events/:id')
  async patchEvent(
    @Request() req: any,
    @Param('id') eventId: string,
    @Body() event: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    return (await this.googleCalendarService.patchEvent(
      userId,
      eventId,
      event,
    )) as Promise<unknown>;
  }

  @Delete('events/:id')
  async removeEvent(@Request() req: any, @Param('id') eventId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    await this.googleCalendarService.deleteEvent(userId, eventId);
    return { success: true };
  }
}
