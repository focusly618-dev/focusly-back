import { Injectable } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { FocusSessionsService } from '../focus-sessions/focus-sessions.service';
import { UsersService } from '../users/users.service';
import {
  InsightsResponse,
  ProductivityTrend,
  StatCardValue,
  TimeDistribution,
} from './schemas/insights.schema';
import { TaskStatus } from '../tasks/schemas/task-status.enum';
import { ITask } from '../tasks/interfaces/task.interface';
import { IFocusSession } from '../focus-sessions/interfaces/focus-session.interface';

@Injectable()
export class InsightsService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly focusSessionsService: FocusSessionsService,
    private readonly usersService: UsersService,
  ) {}

  async getInsights(userId: string, filter: string): Promise<InsightsResponse> {
    const allTasks = await this.tasksService.findAllByUser(userId);
    const allFocusSessions =
      await this.focusSessionsService.findAllByUser(userId);
    const user = await this.usersService.findOne(userId);

    // 2. Determine Date Range based on filter
    const startDate = new Date();
    if (filter === 'Daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'Weekly') {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'Monthly') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default to Weekly
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    }

    // 3. Filter Tasks
    const filteredTasks = allTasks.filter((t) => {
      const taskDate = new Date(t.updatedAt || t.createdAt);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      return taskDate >= startDate || t.status !== TaskStatus.Done;
    });

    // 4. Calculate Metrics

    // Total Focus Hours
    const totalMinutes = filteredTasks.reduce(
      (acc, t) => acc + (t.realTimer || 0),
      0,
    );
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const totalFocusHours: StatCardValue = {
      value: `${hours}h ${mins}m`,
      change: '+12% vs last period', // Mocked comparison for now
      trend: 'up',
    };

    // Task Completion
    const totalInPeriod = filteredTasks.length;
    const completedInPeriod = filteredTasks.filter(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      (t) => t.status === TaskStatus.Done,
    ).length;
    const completionRate =
      totalInPeriod > 0
        ? Math.round((completedInPeriod / totalInPeriod) * 100)
        : 0;
    const taskCompletion: StatCardValue = {
      value: `${completionRate}%`,
      change: '+5% vs last period',
      trend: 'up',
    };

    const energyScore = this.calculateEnergyScore(filteredTasks);
    const goldenWindow = this.calculateGoldenWindow(
      allFocusSessions,
      user?.settings?.workHoursConfig,
    );
    const breakStats = this.calculateBreakHours(allFocusSessions);

    // 5. Productivity Trends (Real calculation)
    const productivityTrends = this.calculateProductivityTrends(
      allTasks,
      allFocusSessions,
      filter,
    );

    // 6. Time Distribution by Category (Real calculation including breaks)
    const breakMinutes = this.extractBreakMinutes(breakStats.value);
    const timeDistribution = this.calculateTimeDistribution(
      filteredTasks,
      breakMinutes,
    );

    const { data: heatmap, labels: heatmapLabels } =
      await this.calculateHeatmap(userId, filter);

    return {
      totalFocusHours,
      taskCompletion,
      energyScore,
      goldenWindow,
      breakHours: breakStats,
      productivityTrends,
      timeDistribution,
      heatmap,
      heatmapLabels,
    };
  }

  private extractBreakMinutes(breakValue: string): number {
    // Value is in format "Xh Ym"
    const match = breakValue.match(/(\d+)h\s+(\d+)m/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
  }

  private calculateProductivityTrends(
    tasks: ITask[],
    sessions: IFocusSession[],
    filter: string,
  ): ProductivityTrend[] {
    if (filter === 'Daily') {
      return this.buildDailyTrends(tasks, sessions);
    } else if (filter === 'Monthly') {
      return this.buildMonthlyTrends(tasks, sessions);
    }
    return this.buildWeeklyTrends(tasks, sessions);
  }

  /**
   * Daily: Group by hour of the day (8AM to 10PM)
   */
  private buildDailyTrends(
    tasks: ITask[],
    sessions: IFocusSession[],
  ): ProductivityTrend[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trends: ProductivityTrend[] = [];
    for (let hour = 8; hour <= 22; hour++) {
      const label =
        hour === 12 ? '12PM' : hour > 12 ? `${hour - 12}PM` : `${hour}AM`;

      // Planned: tasks with deadline today, estimate distributed across work hours
      const plannedMins = tasks.reduce((acc, t) => {
        const d = new Date(t.deadline || t.createdAt);
        if (this.isSameDay(d, today) && t.estimateTimer) {
          // Distribute equally across 8AM-5PM (9 working hours)
          return acc + (t.estimateTimer || 0) / 9;
        }
        return acc;
      }, 0);

      let actualMins = sessions.reduce((acc, s) => {
        const sDate = new Date(s.startedAt);
        if (this.isSameDay(sDate, today) && sDate.getHours() === hour) {
          return acc + (s.durationMinutes || 0);
        }
        return acc;
      }, 0);

      // Fallback to tasks updated in this hour (less precise but better than 0)
      if (actualMins === 0) {
        actualMins = tasks.reduce((acc, t) => {
          const uDate = new Date(t.updatedAt || t.createdAt);
          if (this.isSameDay(uDate, today) && uDate.getHours() === hour) {
            let taskMins = t.realTimer || 0;
            if (t.subtasks) {
              t.subtasks.forEach((st) => {
                taskMins += st.timer || 0;
              });
            }
            return acc + taskMins;
          }
          return acc;
        }, 0);
      }

      trends.push({
        label,
        actual: Number((actualMins / 60).toFixed(1)),
        planned: Number((plannedMins / 60).toFixed(1)),
      });
    }
    return trends;
  }

  /**
   * Weekly: Group by day of the week (MON - SUN)
   */
  private buildWeeklyTrends(
    tasks: ITask[],
    sessions: IFocusSession[],
  ): ProductivityTrend[] {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);

    const trends: ProductivityTrend[] = [];
    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const plannedMins = tasks.reduce((acc, t) => {
        const d = new Date(t.deadline || t.createdAt);
        if (this.isSameDay(d, date)) {
          return acc + (t.estimateTimer || 0);
        }
        return acc;
      }, 0);

      // 1. Sum up from Sessions (Precise)
      let actualMins = sessions.reduce((acc, s) => {
        const sDate = new Date(s.startedAt);
        if (this.isSameDay(sDate, date)) {
          return acc + (s.durationMinutes || 0);
        }
        return acc;
      }, 0);

      // 2. Fallback to Tasks realTimer if no sessions exist for this day (Approximation)
      // We use updatedAt to attribute the time spent to a specific day
      if (actualMins === 0) {
        actualMins = tasks.reduce((acc, t) => {
          const uDate = new Date(t.updatedAt || t.createdAt);
          if (this.isSameDay(uDate, date)) {
            // Include parent task realTimer
            let taskMins = t.realTimer || 0;
            // Include subtasks timer
            if (t.subtasks) {
              t.subtasks.forEach((st) => {
                taskMins += st.timer || 0;
              });
            }
            return acc + taskMins;
          }
          return acc;
        }, 0);
      }

      trends.push({
        label: dayNames[i],
        actual: Number((actualMins / 60).toFixed(1)),
        planned: Number((plannedMins / 60).toFixed(1)),
      });
    }
    return trends;
  }

  /**
   * Monthly: Group by week of the month (W1, W2, W3, W4, W5)
   */
  private buildMonthlyTrends(
    tasks: ITask[],
    sessions: IFocusSession[],
  ): ProductivityTrend[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const trends: ProductivityTrend[] = [];
    let weekStart = new Date(firstDay);
    let weekNum = 1;

    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(Math.min(weekStart.getDate() + 6, lastDay.getDate()));

      const label = `W${weekNum} (${weekStart.getDate()}-${weekEnd.getDate()})`;

      const plannedMins = tasks.reduce((acc, t) => {
        const d = new Date(t.deadline || t.createdAt);
        if (d >= weekStart && d <= weekEnd && d.getMonth() === month) {
          return acc + (t.estimateTimer || 0);
        }
        return acc;
      }, 0);

      let actualMins = sessions.reduce((acc, s) => {
        const sDate = new Date(s.startedAt);
        if (
          sDate >= weekStart &&
          sDate <= weekEnd &&
          sDate.getMonth() === month
        ) {
          return acc + (s.durationMinutes || 0);
        }
        return acc;
      }, 0);

      if (actualMins === 0) {
        actualMins = tasks.reduce((acc, t) => {
          const uDate = new Date(t.updatedAt || t.createdAt);
          if (
            uDate >= weekStart &&
            uDate <= weekEnd &&
            uDate.getMonth() === month
          ) {
            let taskMins = t.realTimer || 0;
            if (t.subtasks) {
              t.subtasks.forEach((st) => {
                taskMins += st.timer || 0;
              });
            }
            return acc + taskMins;
          }
          return acc;
        }, 0);
      }

      trends.push({
        label,
        actual: Number((actualMins / 60).toFixed(1)),
        planned: Number((plannedMins / 60).toFixed(1)),
      });

      weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() + 1);
      weekNum++;
    }

    return trends;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private calculateTimeDistribution(
    tasks: ITask[],
    breakMinutes: number,
  ): TimeDistribution[] {
    const categoryMap = new Map<string, number>();

    // Initialize standard categories
    categoryMap.set('Deep Work', 0);
    categoryMap.set('Meetings', 0);
    categoryMap.set('Admin/Misc', 0);

    tasks.forEach((t) => {
      let cat = 'Deep Work';
      const rawCat = (t.category || '').toLowerCase();

      if (rawCat.includes('meet')) {
        cat = 'Meetings';
      } else if (rawCat.includes('admin') || rawCat.includes('misc')) {
        cat = 'Admin/Misc';
      }

      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (t.realTimer || 0));
    });

    // Add calculated breaks
    categoryMap.set('Rest/Breaks', breakMinutes);

    const colors: Record<string, string> = {
      'Deep Work': '#3b82f6',
      Meetings: '#6366f1',
      'Admin/Misc': '#8b5cf6',
      'Rest/Breaks': '#1e293b',
    };

    const distribution: TimeDistribution[] = [];
    categoryMap.forEach((mins, name) => {
      distribution.push({
        name,
        value: mins,
        color: colors[name] || '#64748b',
      });
    });

    return distribution;
  }

  private calculateEnergyScore(tasks: ITask[]): StatCardValue {
    if (tasks.length === 0) {
      return { value: 'N/A', change: '0 pts', trend: 'neutral' };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    const completed = tasks.filter((t) => t.status === TaskStatus.Done);
    const completionRate = completed.length / tasks.length;

    let efficiencySum = 0;
    let tasksWithTime = 0;
    completed.forEach((t) => {
      const est = t.estimateTimer || 0;
      const real = t.realTimer || 0;
      if (est > 0 && real > 0) {
        const eff = Math.min(est / real, 1.5); // Cap efficiency
        efficiencySum += eff;
        tasksWithTime++;
      }
    });

    const efficiency = tasksWithTime > 0 ? efficiencySum / tasksWithTime : 0.8;
    const rawScore = completionRate * 60 + efficiency * 40;
    const score = Math.min(Math.max(Math.round(rawScore), 0), 100);

    return {
      value: `${score}/100`,
      change: '+2 pts',
      trend: 'up',
    };
  }

  private calculateGoldenWindow(
    sessions: IFocusSession[],
    workHours?: Record<string, any>,
  ): StatCardValue {
    if (sessions.length === 0) {
      // Use values from onboarding/settings if available, otherwise default
      const start = (workHours?.startTime as string) || '09:00';
      const end = (workHours?.endTime as string) || '11:00';
      return {
        value: `${start} - ${end}`,
        change: 'Base on your profile',
        trend: 'neutral',
      };
    }

    const hourStats = new Array(24).fill(0);
    sessions.forEach((s) => {
      const start = new Date(s.startedAt);
      const hour = start.getHours();
      hourStats[hour] += s.durationMinutes || 0;
    });

    let maxMinutes = 0;
    let bestStartHour = 9;

    for (let i = 0; i < 23; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const windowSum = hourStats[i] + hourStats[i + 1];
      if (windowSum > maxMinutes) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        maxMinutes = windowSum;
        bestStartHour = i;
      }
    }

    const format = (h: number) => {
      const hh = h % 24;
      return `${hh > 12 ? hh - 12 : hh === 0 ? 12 : hh} ${hh >= 12 ? 'PM' : 'AM'}`;
    };

    return {
      value: `${format(bestStartHour)} - ${format(bestStartHour + 2)}`,
      change: 'Most productive period',
      trend: 'neutral',
    };
  }

  private calculateBreakHours(sessions: IFocusSession[]): StatCardValue {
    if (sessions.length < 2) {
      return { value: '0h 0m', change: '0%', trend: 'neutral' };
    }

    // Sort by start date
    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

    let breakMinutes = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd =
        new Date(sorted[i].startedAt).getTime() +
        (sorted[i].durationMinutes || 0) * 60 * 1000;
      const nextStart = new Date(sorted[i + 1].startedAt).getTime();

      const gapMs = nextStart - currentEnd;
      const gapMins = gapMs / (1000 * 60);

      // Gap between 15 min and 2 hours is likely a break
      if (gapMins >= 15 && gapMins <= 120) {
        breakMinutes += gapMins;
      }
    }

    const hours = Math.floor(breakMinutes / 60);
    const mins = Math.round(breakMinutes % 60);

    return {
      value: `${hours}h ${mins}m`,
      change: 'Calculated from gaps',
      trend: 'neutral' as const,
    };
  }

  private async calculateHeatmap(
    userId: string,
    filter: string,
  ): Promise<{ data: number[]; labels: string[] }> {
    const sessions = await this.focusSessionsService.findAllByUser(userId);
    const intensityMap = new Map<string, number>();
    const now = new Date();

    if (filter === 'Daily') {
      // 24 hours of today
      sessions.forEach((s) => {
        const start = new Date(s.startedAt);
        if (start.toDateString() === now.toDateString()) {
          const hour = start.getHours();
          intensityMap.set(
            `${hour}`,
            (intensityMap.get(`${hour}`) || 0) + s.durationMinutes,
          );
        }
      });

      const data = Array.from({ length: 24 }).map((_, h) => {
        const mins = intensityMap.get(`${h}`) || 0;
        if (mins === 0) return 0;
        if (mins < 15) return 1;
        if (mins < 30) return 2;
        if (mins < 45) return 3;
        if (mins < 60) return 4;
        return 5;
      });

      return { data, labels: ['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'] };
    }

    if (filter === 'Weekly') {
      // Last 7 days
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }

      sessions.forEach((s) => {
        const dateKey = new Date(s.startedAt).toISOString().split('T')[0];
        if (days.includes(dateKey)) {
          intensityMap.set(
            dateKey,
            (intensityMap.get(dateKey) || 0) + s.durationMinutes,
          );
        }
      });

      const data = days.map((day) => {
        const mins = intensityMap.get(day) || 0;
        if (mins === 0) return 0;
        if (mins < 60) return 1;
        if (mins < 120) return 2;
        if (mins < 180) return 3;
        if (mins < 240) return 4;
        return 5;
      });

      const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      return { data, labels };
    }

    // Monthly: Last 30 days
    const monthDays: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      monthDays.push(d.toISOString().split('T')[0]);
    }

    sessions.forEach((s) => {
      const dateKey = new Date(s.startedAt).toISOString().split('T')[0];
      if (monthDays.includes(dateKey)) {
        intensityMap.set(
          dateKey,
          (intensityMap.get(dateKey) || 0) + s.durationMinutes,
        );
      }
    });

    const data = monthDays.map((day) => {
      const mins = intensityMap.get(day) || 0;
      if (mins === 0) return 0;
      if (mins < 60) return 1;
      if (mins < 180) return 2;
      return 3;
    });

    return { data, labels: ['Inicio', 'Mitad', 'Fin'] };
  }
}
