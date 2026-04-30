import { Controller, Post, Headers, Body, Logger } from '@nestjs/common';

@Controller('google-calendar')
export class GoogleCalendarWebhookController {
  private readonly logger = new Logger(GoogleCalendarWebhookController.name);

  constructor() {}

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
      `Google Webhook received for user: ${userId}, state: ${state}`,
    );

    // 'sync' es el mensaje de confirmación inicial, no es un cambio real
    if (state === 'sync') {
      this.logger.log(`Channel ${channelId} successfully synchronized.`);
      return { status: 'synchronized' };
    }

    return { status: 'processed' };
  }
}
