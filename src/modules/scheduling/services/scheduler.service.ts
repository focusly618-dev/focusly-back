import { Injectable } from '@nestjs/common';
import {
  ExternalCalendarEvent,
  Meeting,
  Task,
  WorkBlock,
  SchedulingConstraints,
  SchedulingResult,
} from '../domain/scheduling-entities.types';

/**
 * MOTION-STYLE SCHEDULER
 *
 * This scheduler thinks in terms of:
 * 1. Hard constraints (ExternalCalendarEvent, Meeting) - cannot be moved
 * 2. Flexible work (Task) - can be scheduled around constraints
 * 3. Work blocks (WorkBlock) - generated time allocations
 * 4. Scheduling constraints (SchedulingConstraints) - user preferences
 *
 * The scheduler's goal is to "resolve constraints dynamically and minimize scheduling damage"
 * rather than just "put tasks in gaps".
 */
@Injectable()
export class SchedulerService {
  /**
   * Main scheduling entry point.
   * Takes all inputs and generates an optimal schedule.
   */
  async schedule(
    userId: string,
    externalEvents: ExternalCalendarEvent[],
    meetings: Meeting[],
    tasks: Task[],
    constraints: SchedulingConstraints,
    existingWorkBlocks?: WorkBlock[],
  ): Promise<SchedulingResult> {
    console.log(`[SCHEDULER] Starting scheduling for user: ${userId}`);
    const scheduledAt = new Date();

    // 1. Build the timeline of hard constraints
    const hardConstraints = this.buildHardConstraints(externalEvents, meetings);

    // 2. Filter tasks that need scheduling
    const tasksToSchedule = this.filterTasksNeedingScheduling(tasks);

    // 3. Sort tasks by priority and urgency
    const sortedTasks = this.sortTasksByPriority(tasksToSchedule, constraints);

    // 4. Delete existing generated work blocks for these tasks
    // (This would be done in the actual implementation)

    // 5. Schedule each task
    const scheduledTasks: SchedulingResult['scheduledTasks'] = [];
    const unscheduledTasks: SchedulingResult['unscheduledTasks'] = [];
    const conflicts: SchedulingResult['conflicts'] = [];

    for (const task of sortedTasks) {
      const result = await this.scheduleSingleTask(
        task,
        hardConstraints,
        constraints,
        existingWorkBlocks || [],
      );

      if (
        result.status === 'scheduled' ||
        result.status === 'partially_scheduled'
      ) {
        scheduledTasks.push(result);
      } else {
        unscheduledTasks.push({
          taskId: task.id,
          reason:
            (result.reason as
              | 'no_available_slots'
              | 'deadline_passed'
              | 'constraints_conflict'
              | 'insufficient_time') || 'no_available_slots',
          suggestedAction: this.getSuggestedAction(task, result.reason),
        });
      }
    }

    // 6. Calculate statistics
    const totalWorkBlocksCreated = scheduledTasks.reduce(
      (sum, st) => sum + st.workBlocks.length,
      0,
    );
    const totalScheduledMinutes = scheduledTasks.reduce(
      (sum, st) =>
        sum + st.workBlocks.reduce((blockSum, wb) => blockSum + wb.duration, 0),
      0,
    );

    // 7. Calculate scheduling efficiency
    const schedulingEfficiency = this.calculateSchedulingEfficiency(
      hardConstraints,
      scheduledTasks,
      constraints,
    );

    return {
      userId,
      scheduledAt,
      scheduledTasks,
      unscheduledTasks,
      conflicts,
      totalTasksScheduled: scheduledTasks.length,
      totalWorkBlocksCreated,
      totalScheduledMinutes,
      schedulingEfficiency,
    };
  }

  /**
   * Build a timeline of all hard constraints that cannot be moved.
   */
  private buildHardConstraints(
    externalEvents: ExternalCalendarEvent[],
    meetings: Meeting[],
  ): Array<{ start: Date; end: Date; type: string; id: string }> {
    const constraints: Array<{
      start: Date;
      end: Date;
      type: string;
      id: string;
    }> = [];

    // Add external calendar events
    externalEvents.forEach((event) => {
      constraints.push({
        start: event.start,
        end: event.end,
        type: 'external_event',
        id: event.id,
      });
    });

    // Add meetings
    meetings.forEach((meeting) => {
      constraints.push({
        start: meeting.start,
        end: meeting.end,
        type: 'meeting',
        id: meeting.id,
      });
    });

    // Sort by start time
    constraints.sort((a, b) => a.start.getTime() - b.start.getTime());

    return constraints;
  }

  /**
   * Filter tasks that actually need scheduling.
   * Skip completed, cancelled, or already scheduled tasks.
   */
  private filterTasksNeedingScheduling(tasks: Task[]): Task[] {
    return tasks.filter(
      (task) =>
        task.status !== 'completed' &&
        task.status !== 'cancelled' &&
        task.status !== 'in_progress',
    );
  }

  /**
   * Sort tasks by priority and urgency based on scheduling strategy.
   */
  private sortTasksByPriority(
    tasks: Task[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _constraints: SchedulingConstraints,
  ): Task[] {
    const sorted = [...tasks];

    sorted.sort((a, b) => {
      // First sort by priority value (higher first)
      if (a.priorityValue !== b.priorityValue) {
        return b.priorityValue - a.priorityValue;
      }

      // Then by deadline (earlier first)
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }

      // If one has deadline and other doesn't, prioritize the one with deadline
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      // Finally by urgency
      const urgencyOrder = {
        immediate: 4,
        today: 3,
        this_week: 2,
        this_month: 1,
        flexible: 0,
      };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });

    return sorted;
  }

  /**
   * Schedule a single task around hard constraints.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async scheduleSingleTask(
    task: Task,
    hardConstraints: Array<{
      start: Date;
      end: Date;
      type: string;
      id: string;
    }>,
    constraints: SchedulingConstraints,
    existingWorkBlocks: WorkBlock[],
  ): Promise<{
    taskId: string;
    workBlocks: WorkBlock[];
    status: 'scheduled' | 'partially_scheduled' | 'could_not_schedule';
    reason?: string;
  }> {
    const workBlocks: WorkBlock[] = [];
    let remainingDuration = task.estimatedDuration;

    // Check if task has hard deadline that has already passed
    if (task.hardDeadline && task.hardDeadline < new Date()) {
      return {
        taskId: task.id,
        workBlocks: [],
        status: 'could_not_schedule',
        reason: 'deadline_passed',
      };
    }

    // Calculate scheduling window
    const schedulingWindow = this.calculateSchedulingWindow(task, constraints);

    // Find available time slots
    const availableSlots = this.findAvailableSlots(
      schedulingWindow.start,
      schedulingWindow.end,
      hardConstraints,
      existingWorkBlocks,
      constraints,
    );

    // Schedule the task in available slots
    for (const slot of availableSlots) {
      if (remainingDuration <= 0) break;

      // Schedule as much as fits in this slot
      const slotDuration = this.getSlotDuration(slot);
      const maxBlockDuration = Math.min(
        slotDuration,
        constraints.maxFocusBlockDuration,
      );
      const blockDuration = Math.min(maxBlockDuration, remainingDuration);

      if (blockDuration >= 5) {
        // Minimum 5 minutes
        const workBlock = this.createWorkBlock(
          task,
          slot.start,
          new Date(slot.start.getTime() + blockDuration * 60000),
          constraints,
        );
        workBlocks.push(workBlock);
        remainingDuration -= blockDuration;
      }
    }

    // Determine final status
    if (remainingDuration === 0) {
      return {
        taskId: task.id,
        workBlocks,
        status: 'scheduled',
      };
    } else if (workBlocks.length > 0) {
      return {
        taskId: task.id,
        workBlocks,
        status: 'partially_scheduled',
        reason: 'insufficient_time',
      };
    } else {
      return {
        taskId: task.id,
        workBlocks,
        status: 'could_not_schedule',
        reason: 'no_available_slots',
      };
    }
  }

  /**
   * Calculate the scheduling window for a task.
   */
  private calculateSchedulingWindow(
    task: Task,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _constraints: SchedulingConstraints,
  ): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);

    // Round to next 5 minutes
    start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5);
    start.setSeconds(0);
    start.setMilliseconds(0);

    // Calculate end based on deadline or default window
    let end: Date;
    if (task.hardDeadline) {
      end = new Date(task.hardDeadline);
    } else if (task.deadline) {
      end = new Date(task.deadline);
    } else {
      // Default to 14 days from now
      end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  /**
   * Find available time slots within a window, respecting constraints.
   */
  private findAvailableSlots(
    windowStart: Date,
    windowEnd: Date,
    hardConstraints: Array<{
      start: Date;
      end: Date;
      type: string;
      id: string;
    }>,
    existingWorkBlocks: WorkBlock[],
    constraints: SchedulingConstraints,
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const slotSize = 5; // 5-minute granularity

    let currentPtr = new Date(windowStart);

    while (currentPtr.getTime() < windowEnd.getTime()) {
      // Check if current time is within working hours
      if (!this.isWithinWorkingHours(currentPtr, constraints)) {
        currentPtr.setMinutes(currentPtr.getMinutes() + slotSize);
        continue;
      }

      // Check if current time overlaps with any hard constraint
      const checkEnd = new Date(currentPtr.getTime() + slotSize * 60000);
      if (this.isOverlapping(currentPtr, checkEnd, hardConstraints)) {
        currentPtr.setMinutes(currentPtr.getMinutes() + slotSize);
        continue;
      }

      // Check if current time overlaps with existing work blocks
      if (
        this.isOverlappingWithWorkBlocks(
          currentPtr,
          checkEnd,
          existingWorkBlocks,
        )
      ) {
        currentPtr.setMinutes(currentPtr.getMinutes() + slotSize);
        continue;
      }

      // Found a free slot, extend it as much as possible
      const slotStart = new Date(currentPtr.getTime());
      const slotEnd = new Date(currentPtr.getTime() + slotSize * 60000);

      while (
        this.isWithinWorkingHours(slotEnd, constraints) &&
        !this.isOverlapping(
          slotEnd,
          new Date(slotEnd.getTime() + slotSize * 60000),
          hardConstraints,
        ) &&
        !this.isOverlappingWithWorkBlocks(
          slotEnd,
          new Date(slotEnd.getTime() + slotSize * 60000),
          existingWorkBlocks,
        ) &&
        slotEnd.getTime() < windowEnd.getTime()
      ) {
        slotEnd.setMinutes(slotEnd.getMinutes() + slotSize);
      }

      slots.push({ start: slotStart, end: slotEnd });
      currentPtr = new Date(slotEnd.getTime());
    }

    return slots;
  }

  /**
   * Check if a time is within working hours.
   */
  private isWithinWorkingHours(
    date: Date,
    constraints: SchedulingConstraints,
  ): boolean {
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = dayNames[date.getDay()] as
      | 'sun'
      | 'mon'
      | 'tue'
      | 'wed'
      | 'thu'
      | 'fri'
      | 'sat';

    if (!constraints.workingDays.includes(dayName)) {
      return false;
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeVal = hours * 60 + minutes;

    const [startH, startM] = constraints.workingHours.start
      .split(':')
      .map(Number);
    const [endH, endM] = constraints.workingHours.end.split(':').map(Number);

    const startVal = startH * 60 + startM;
    const endVal = endH * 60 + endM;

    return timeVal >= startVal && timeVal < endVal;
  }

  /**
   * Check if a time interval overlaps with any hard constraint.
   */
  private isOverlapping(
    start: Date,
    end: Date,
    constraints: Array<{ start: Date; end: Date; type: string; id: string }>,
  ): boolean {
    return constraints.some((constraint) => {
      return (
        start.getTime() < constraint.end.getTime() &&
        end.getTime() > constraint.start.getTime()
      );
    });
  }

  /**
   * Check if a time interval overlaps with any existing work block.
   */
  private isOverlappingWithWorkBlocks(
    start: Date,
    end: Date,
    workBlocks: WorkBlock[],
  ): boolean {
    return workBlocks.some((wb) => {
      return (
        start.getTime() < wb.end.getTime() && end.getTime() > wb.start.getTime()
      );
    });
  }

  /**
   * Get the duration of a slot in minutes.
   */
  private getSlotDuration(slot: { start: Date; end: Date }): number {
    return (slot.end.getTime() - slot.start.getTime()) / 60000;
  }

  /**
   * Create a work block for a task.
   */
  private createWorkBlock(
    task: Task,
    start: Date,
    end: Date,
    constraints: SchedulingConstraints,
  ): WorkBlock {
    return {
      id: `wb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: task.userId,
      taskId: task.id,
      start,
      end,
      duration: (end.getTime() - start.getTime()) / 60000,
      blockType: 'focus',
      isGenerated: true,
      schedulingScore: this.calculateSchedulingScore(
        task,
        start,
        end,
        constraints,
      ),
      schedulingReason: this.getSchedulingReason(task, start, end),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Calculate how well a work block fits the task's preferences.
   */
  private calculateSchedulingScore(
    task: Task,
    start: Date,
    end: Date,
    constraints: SchedulingConstraints,
  ): number {
    let score = 0;
    const hour = start.getHours();

    // Check if within golden window
    if (constraints.goldenWindow) {
      const [startH, startM] = constraints.goldenWindow.start
        .split(':')
        .map((n: string) => Number(n));
      const [endH, endM] = constraints.goldenWindow.end
        .split(':')
        .map((n: string) => Number(n));
      const startVal = startH * 60 + startM;
      const endVal = endH * 60 + endM;
      const timeVal = hour * 60 + start.getMinutes();

      if (timeVal >= startVal && timeVal < endVal) {
        score += 0.4;
      }
    }

    // Check if on preferred day
    return Math.min(score, 1);
  }

  /**
   * Get a human-readable reason for why a block was scheduled here.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getSchedulingReason(task: Task, start: Date, _end: Date): string {
    const reasons: string[] = [];

    if (task.deadline) {
      const daysUntilDeadline = Math.ceil(
        (task.deadline.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
      );
      reasons.push(`${daysUntilDeadline} days before deadline`);
    }

    const hour = start.getHours();
    if (hour >= 6 && hour < 12) reasons.push('morning slot');
    else if (hour >= 12 && hour < 18) reasons.push('afternoon slot');
    else if (hour >= 18 && hour < 22) reasons.push('evening slot');

    return reasons.join(', ') || 'available slot';
  }

  /**
   * Get a suggested action for a task that couldn't be scheduled.
   */
  private getSuggestedAction(task: Task, reason?: string): string {
    if (reason === 'deadline_passed') {
      return 'Update deadline or mark as completed';
    }
    if (reason === 'no_available_slots') {
      return 'Extend working hours or reduce task duration';
    }
    if (reason === 'constraints_conflict') {
      return 'Reschedule conflicting meetings or events';
    }
    if (reason === 'insufficient_time') {
      return 'Split task into smaller blocks or extend deadline';
    }
    return 'Review task constraints and try again';
  }

  /**
   * Calculate scheduling efficiency (0-1).
   */
  private calculateSchedulingEfficiency(
    hardConstraints: Array<{
      start: Date;
      end: Date;
      type: string;
      id: string;
    }>,
    scheduledTasks: SchedulingResult['scheduledTasks'],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _constraints: SchedulingConstraints,
  ): number {
    // This is a simplified calculation
    // In a real implementation, this would be more sophisticated
    const totalScheduledTime = scheduledTasks.reduce(
      (sum, st) =>
        sum + st.workBlocks.reduce((blockSum, wb) => blockSum + wb.duration, 0),
      0,
    );

    // Calculate total available working time in the scheduling window
    // This is a placeholder - real implementation would calculate actual available time
    const totalAvailableTime = 8 * 60 * 14; // 8 hours/day * 14 days

    return Math.min(totalScheduledTime / totalAvailableTime, 1);
  }
}
