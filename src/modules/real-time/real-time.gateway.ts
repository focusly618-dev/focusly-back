import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: [
      'https://focusly-front-psi.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  },
  namespace: 'realtime',
})
export class RealTimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealTimeGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      void client.join(`user_${userId}`);
      this.logger.log(
        `Client ${client.id} connected and joined room: user_${userId}`,
      );
    } else {
      this.logger.warn(
        `Client ${client.id} connected without userId. Query: ${JSON.stringify(client.handshake.query)}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emits a schedule update event to all connected sockets of a specific user.
   */
  emitScheduleUpdate(userId: string, data: any) {
    if (!this.server) {
      this.logger.warn(
        'WebSocket server is not initialized yet. Cannot emit update.',
      );
      return;
    }
    this.server.to(`user_${userId}`).emit('schedule_updated', data);
    this.logger.log(`Sent schedule_updated to room user_${userId}`);
  }
}
