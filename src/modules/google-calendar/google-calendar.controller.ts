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

    // 1. Get already synced Google Event IDs from the database
    const syncedIds = await this.tasksService.getSyncedGoogleIds(userId);
    const normalizedSyncedIds = new Set(syncedIds.map((id) => normalizeId(id)));

    // 2. Filter out events that already exist in our DB
    const filteredItems = rawData.items.filter((item) => {
      const normalizedEventId = normalizeId(item.id as string);
      const baseEventId = getBaseId(item.id as string);
      return (
        !normalizedSyncedIds.has(normalizedEventId) &&
        !normalizedSyncedIds.has(baseEventId)
      );
    });

    // 3. Process the remaining events through the pipeline
    const processedEvents = await Promise.all(
      filteredItems.map((event) => processGoogleEvent(event)),
    );

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
