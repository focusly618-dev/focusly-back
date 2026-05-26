import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from '../tasks/tasks.service';
import { SchedulerService } from '../tasks/scheduler.service';

@Controller('google-calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @Get('events')
  async getEvents(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;

    // 1. Ejecutar la sincronización (Incremental o Completa)
    await this.googleCalendarService.syncCalendar(userId);

    // 2. Obtener todas las tareas de tipo GoogleTask de la base de datos local
    const userTasks = await this.tasksService.findAllByUser(userId);
    const googleTasks = userTasks.filter((t) => t.task_type === 'GoogleTask');

    // 3. Normalizar y retornar en el formato esperado por el frontend
    const mappedEvents = googleTasks.map((t) => ({
      id: t.id,
      google_event_id: t.google_event_id,
      title: t.title,
      notes_encrypted: t.notesEncrypted || '',
      deadline: t.deadline
        ? t.deadline.toISOString()
        : new Date().toISOString(),
      estimated_start_date: t.estimated_start_date
        ? t.estimated_start_date.toISOString()
        : new Date().toISOString(),
      estimated_end_date: t.estimated_end_date
        ? t.estimated_end_date.toISOString()
        : undefined,
      status: t.status,
      priority_level: t.priorityLevel || 1,
      tags: t.tags || [],
      links: t.links || [],
      estimate_timer: t.estimateTimer || 30,
      task_type: t.task_type,
      is_all_day: false, // se puede deducir o mapear según requiera el frontend
      created_at: t.createdAt
        ? t.createdAt.toISOString()
        : new Date().toISOString(),
      updated_at: t.updatedAt
        ? t.updatedAt.toISOString()
        : new Date().toISOString(),
    }));

    return mappedEvents;
  }

  @Post('events')
  async createEvent(@Request() req: any, @Body() event: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;

    // Crear en Google Calendar
    const googleEvent = await this.googleCalendarService.createEvent(
      userId,
      event,
    );

    // Forzar sincronización inmediata para reflejar en DB y notificar clientes
    await this.googleCalendarService.syncCalendar(userId);

    return googleEvent;
  }

  @Patch('events/:id')
  async patchEvent(
    @Request() req: any,
    @Param('id') eventId: string,
    @Body() event: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;

    // Actualizar en Google Calendar
    const googleEvent = await this.googleCalendarService.patchEvent(
      userId,
      eventId,
      event,
    );

    // Forzar sincronización inmediata
    await this.googleCalendarService.syncCalendar(userId);

    return googleEvent;
  }

  @Delete('events/:id')
  async removeEvent(@Request() req: any, @Param('id') eventId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;

    // Eliminar en Google Calendar
    await this.googleCalendarService.deleteEvent(userId, eventId);

    // Forzar sincronización inmediata
    await this.googleCalendarService.syncCalendar(userId);

    return { success: true };
  }
}
