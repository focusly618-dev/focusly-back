import { Controller, Post, Headers, Logger } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('google-calendar')
export class GoogleCalendarWebhookController {
  private readonly logger = new Logger(GoogleCalendarWebhookController.name);

  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  /**
   * Endpoint receptor de notificaciones Push de Google Calendar.
   * Google envía un POST a esta URL cada vez que hay un cambio.
   */
  @Post('webhook')
  handleGoogleWebhook(
    @Headers('x-goog-channel-id') channelId: string,
    @Headers('x-goog-resource-id') resourceId: string,
    @Headers('x-goog-channel-token') userId: string, // Usamos el token para pasar el userId
    @Headers('x-goog-resource-state') state: string,
  ) {
    this.logger.log(
      `Google Webhook received for user: ${userId}, state: ${state}, channelId: ${channelId}`,
    );

    // 'sync' es el mensaje de confirmación inicial, no es un cambio real
    if (state === 'sync') {
      this.logger.log(`Channel ${channelId} successfully synchronized.`);
      return { status: 'synchronized' };
    }

    if (state === 'exists') {
      this.logger.log(`Triggering incremental sync for user: ${userId}`);
      // Ejecutamos de forma asíncrona para responder de inmediato a Google y evitar timeouts
      this.googleCalendarService.syncCalendar(userId).catch((err) => {
        this.logger.error(
          `Failed to execute incremental sync for user ${userId} via webhook:`,
          err,
        );
      });
      return { status: 'sync_triggered' };
    }

    return { status: 'processed' };
  }
}
