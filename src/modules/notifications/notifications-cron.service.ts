import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleUpcomingTasks() {
    const now = new Date();
    const earlyWindowStart = new Date(now.getTime() + 1 * 60 * 1000);
    const earlyWindowEnd = new Date(now.getTime() + 15 * 60 * 1000);

    const lastMinuteWindowStart = now;
    const lastMinuteWindowEnd = new Date(now.getTime() + 1 * 60 * 1000);

    this.logger.debug(
      `Cron Run: ${now.toLocaleTimeString()}. Checking windows: Early [${earlyWindowStart.toLocaleTimeString()} - ${earlyWindowEnd.toLocaleTimeString()}] | LastMinute [${lastMinuteWindowStart.toLocaleTimeString()} - ${lastMinuteWindowEnd.toLocaleTimeString()}]`,
    );

    try {
      // 1. AVISO TEMPRANO (1-15 min)
      const earlyTasks = await this.tasksService.findUpcomingTasks(
        earlyWindowStart,
        earlyWindowEnd,
      );

      for (const task of earlyTasks) {
        if (!task.userId) continue;
        const user = await this.usersService.findOne(task.userId);
        if (user && user.fcmToken) {
          await this.sendTaskNotification(user, task, 'Upcoming Task! 🚀');
          await this.tasksService.markAsNotified(task.id);
        }
      }

      // 2. AVISO DE ÚLTIMO MINUTO (0-1 min)
      const lastMinuteTasks = await this.tasksService.findLastMinuteTasks(
        lastMinuteWindowStart,
        lastMinuteWindowEnd,
      );

      for (const task of lastMinuteTasks) {
        if (!task.userId) continue;
        const user = await this.usersService.findOne(task.userId);
        if (user && user.fcmToken) {
          await this.sendTaskNotification(user, task, 'Starts in 1 minute! ⚠️');
          await this.tasksService.markAsLastMinuteNotified(task.id);
        }
      }
    } catch (error) {
      this.logger.error('Error in handleUpcomingTasks cron:', error);
    }
  }

  private async sendTaskNotification(
    user: { id: string; fcmToken?: string | null },
    task: { id: string; title: string; deadline?: Date | string | null },
    title: string,
  ) {
    if (!user.fcmToken) return;

    try {
      const deadlineStr =
        task.deadline instanceof Date
          ? task.deadline.toISOString()
          : String(task.deadline || '');

      await this.notificationsService.sendPushNotification(
        user.fcmToken,
        title,
        `Your task "${task.title}" starts soon.`,
        {
          taskId: task.id,
          taskTitle: task.title,
          deadline: deadlineStr,
        },
      );
      this.logger.log(`Sent "${title}" for task ${task.id} to user ${user.id}`);
    } catch (err) {
      this.logger.error(
        `Failed to send notification for task ${task.id}:`,
        err,
      );
    }
  }
}
