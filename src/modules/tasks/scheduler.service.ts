import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { TasksService } from './tasks.service';
import { TimeBlocksService } from '../time-blocks/time-blocks.service';
import { ITask } from './interfaces/task.interface';
import { ITimeBlock } from '../time-blocks/interfaces/time-block.interface';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { SchedulerService as NewSchedulerService } from '../scheduling/services/scheduler.service';
import { MigrationService } from '../scheduling/services/migration.service';
import {
  ExternalCalendarEvent,
  Meeting,
  Task as NewTask,
  WorkBlock as NewWorkBlock,
  SchedulingResult,
} from '../scheduling/domain/scheduling-entities.types';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    private readonly timeBlocksService: TimeBlocksService,
    private readonly newSchedulerService: NewSchedulerService,
    private readonly migrationService: MigrationService,
  ) {}

  /**
   * Triggers the scheduling engine for a specific user.
   * Re-calculates and reschedules all active, unlocked tasks around fixed constraints.
   *
   * This method now uses the new Motion-style scheduler for better constraint handling.
   */
  async scheduleUserTasks(userId: string): Promise<void> {
    console.log(
      `[SCHEDULER] Running Motion-style scheduler for user: ${userId}`,
    );

    try {
      // 1. Fetch all tasks
      const tasksSnapshot = await this.firebaseService.db
        .collection('tasks')
        .where('userId', '==', userId)
        .where('deletedAt', '==', null)
        .get();

      const allTasks = tasksSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          deadline: data.deadline
            ? data.deadline instanceof admin.firestore.Timestamp
              ? data.deadline.toDate()
              : new Date(data.deadline as string | number)
            : new Date(),
          estimated_start_date: data.estimated_start_date
            ? data.estimated_start_date instanceof admin.firestore.Timestamp
              ? data.estimated_start_date.toDate()
              : new Date(data.estimated_start_date as string | number)
            : undefined,
          estimated_end_date: data.estimated_end_date
            ? data.estimated_end_date instanceof admin.firestore.Timestamp
              ? data.estimated_end_date.toDate()
              : new Date(data.estimated_end_date as string | number)
            : undefined,
          createdAt: data.createdAt
            ? data.createdAt instanceof admin.firestore.Timestamp
              ? data.createdAt.toDate()
              : new Date(data.createdAt as string | number)
            : new Date(),
          updatedAt: data.updatedAt
            ? data.updatedAt instanceof admin.firestore.Timestamp
              ? data.updatedAt.toDate()
              : new Date(data.updatedAt as string | number)
            : new Date(),
        } as ITask;
      });

      // 2. Fetch all time blocks
      const timeBlocks = await this.timeBlocksService.findAllByUser(userId);

      // 3. Convert legacy entities to new architecture
      const externalEvents: ExternalCalendarEvent[] = [];
      const meetings: Meeting[] = [];
      const newTasks: NewTask[] = [];
      const existingWorkBlocks: NewWorkBlock[] = [];

      // Migrate tasks to appropriate entity types
      for (const task of allTasks) {
        const migrated = this.migrationService.migrateTask(task);

        if (migrated.externalEvent) {
          externalEvents.push(migrated.externalEvent);
        } else if (migrated.meeting) {
          meetings.push(migrated.meeting);
        } else if (migrated.task) {
          newTasks.push(migrated.task);
        } else if (migrated.workBlock) {
          existingWorkBlocks.push(migrated.workBlock);
        }
      }

      // Migrate time blocks
      for (const timeBlock of timeBlocks) {
        existingWorkBlocks.push(
          this.migrationService.migrateTimeBlock(timeBlock),
        );
      }

      // 4. Get or create scheduling constraints
      const constraints =
        this.migrationService.createDefaultSchedulingConstraints(userId);

      // 5. Run new Motion-style scheduler
      const schedulingResult = await this.newSchedulerService.schedule(
        userId,
        externalEvents,
        meetings,
        newTasks,
        constraints,
        existingWorkBlocks,
      );

      console.log(`[SCHEDULER] Scheduling completed:`, {
        tasksScheduled: schedulingResult.totalTasksScheduled,
        workBlocksCreated: schedulingResult.totalWorkBlocksCreated,
        efficiency: schedulingResult.schedulingEfficiency,
        conflicts: schedulingResult.conflicts.length,
        unscheduledTasks: schedulingResult.unscheduledTasks.length,
      });

      // 6. Apply scheduling results to database
      await this.applySchedulingResults(schedulingResult, userId);
    } catch (error) {
      console.error('[SCHEDULER] Error running Motion-style scheduler:', error);
      // Fallback to legacy scheduler if new one fails
      console.log('[SCHEDULER] Falling back to legacy scheduler');
      await this.scheduleUserTasksLegacy(userId);
    }
  }

  /**
   * Legacy scheduler method (original implementation).
   * Kept for fallback during transition period.
   */
  private async scheduleUserTasksLegacy(userId: string): Promise<void> {
    console.log(
      `[SCHEDULER-LEGACY] Running legacy scheduler for user: ${userId}`,
    );
    console.log(`[SCHEDULER] Running scheduler for user: ${userId}`);

    // 1. Fetch user settings for working hours
    const userDoc = await this.firebaseService.db
      .collection('users')
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      console.warn(
        `[SCHEDULER] User ${userId} not found. Aborting scheduling.`,
      );
      return;
    }
    const userData = userDoc.data() as {
      settings?: {
        workHoursConfig?: {
          selectedDays: string[];
          startTime: string;
          endTime: string;
        };
      };
    };
    const workHoursConfig = userData?.settings?.workHoursConfig || {
      selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      startTime: '09:00',
      endTime: '17:00',
    };

    // 2. Fetch all fixed constraints (Meetings, External Events, and Locked Focus Blocks)
    const timeBlocks = await this.timeBlocksService.findAllByUser(userId);
    const fixedBlocks = timeBlocks.filter(
      (b) =>
        b.blockType === 'Meeting' ||
        b.blockType === 'External_Event' ||
        b.isLocked,
    );

    // 3. Fetch all active, unlocked tasks
    const tasksSnapshot = await this.firebaseService.db
      .collection('tasks')
      .where('userId', '==', userId)
      .where('deletedAt', '==', null)
      .get();

    const allTasks = tasksSnapshot.docs.map((doc) => {
      const data = doc.data();
      // Parse dates safely
      return {
        ...data,
        id: doc.id,
        deadline: data.deadline
          ? data.deadline instanceof admin.firestore.Timestamp
            ? data.deadline.toDate()
            : new Date(data.deadline as string | number)
          : new Date(),
        estimated_start_date: data.estimated_start_date
          ? data.estimated_start_date instanceof admin.firestore.Timestamp
            ? data.estimated_start_date.toDate()
            : new Date(data.estimated_start_date as string | number)
          : undefined,
        estimated_end_date: data.estimated_end_date
          ? data.estimated_end_date instanceof admin.firestore.Timestamp
            ? data.estimated_end_date.toDate()
            : new Date(data.estimated_end_date as string | number)
          : undefined,
      } as ITask;
    });

    const activeTasks = allTasks.filter((t) => t.status !== 'Done');
    const lockedTasks = activeTasks.filter((t) => t.isLocked);
    const unlockedTasks = activeTasks.filter((t) => !t.isLocked);

    // Sort unlocked tasks by priority (Critical/4 to Low/1) and then by deadline (earlier first)
    unlockedTasks.sort((a, b) => {
      const pA = a.priorityLevel || 1;
      const pB = b.priorityLevel || 1;
      if (pA !== pB) return pB - pA; // Descending priority
      return a.deadline.getTime() - b.deadline.getTime(); // Ascending deadline
    });

    // 4. Delete all existing unlocked Focus Blocks (Generated Work Blocks)
    await this.timeBlocksService.deleteManyFocusBlocks(userId);

    // 5. Build timeline of fixed intervals
    // An interval is represented as { start: number, end: number } (timestamps)
    const fixedIntervals: { start: number; end: number }[] = fixedBlocks.map(
      (b) => ({
        start: b.startTime.getTime(),
        end: b.endTime.getTime(),
      }),
    );

    // Add locked tasks as fixed intervals too
    lockedTasks.forEach((t) => {
      if (t.estimated_start_date && t.estimated_end_date) {
        const startDate =
          t.estimated_start_date instanceof Date
            ? t.estimated_start_date
            : new Date(t.estimated_start_date);
        const endDate =
          t.estimated_end_date instanceof Date
            ? t.estimated_end_date
            : new Date(t.estimated_end_date);
        fixedIntervals.push({
          start: startDate.getTime(),
          end: endDate.getTime(),
        });
      }
    });

    // Helper to check if a 5-minute slot overlaps with any fixed interval
    const isOverlapping = (start: number, end: number): boolean => {
      return fixedIntervals.some((interval) => {
        return start < interval.end && end > interval.start;
      });
    };

    // Helper to check if a date is within working hours
    const isWithinWorkingHours = (date: Date): boolean => {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = dayNames[date.getDay()];
      if (!workHoursConfig.selectedDays.includes(dayName)) return false;

      const hours = date.getHours();
      const minutes = date.getMinutes();
      const timeVal = hours * 60 + minutes;

      const [startH, startM] = workHoursConfig.startTime
        .split(':')
        .map((n: string) => Number(n));
      const [endH, endM] = workHoursConfig.endTime
        .split(':')
        .map((n: string) => Number(n));

      const startVal = startH * 60 + startM;
      const endVal = endH * 60 + endM;

      return timeVal >= startVal && timeVal < endVal;
    };

    // 6. Schedule each task
    // We schedule over the next 14 days
    const maxDays = 14;
    const now = new Date();
    // Round now to next 5 minutes
    const startMs =
      Math.ceil(now.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000);
    const currentTime = new Date(startMs);

    const generatedFocusBlocks: Partial<ITimeBlock>[] = [];
    const taskUpdates: { id: string; updates: Partial<ITask> }[] = [];

    for (const task of unlockedTasks) {
      const durationMinutes = task.estimateTimer || 30;
      const isSplitable = task.isSplitable !== false; // default to true
      const minBlock = task.minBlockDuration || 30;

      let remainingDuration = durationMinutes;
      let taskFirstStart: Date | null = null;
      let taskLastEnd: Date | null = null;

      // We start searching from currentTime or now, but keep track of scan limits
      let searchPtr = new Date(currentTime.getTime());
      const endSearchTime = new Date(
        now.getTime() + maxDays * 24 * 60 * 60 * 1000,
      );

      while (
        remainingDuration > 0 &&
        searchPtr.getTime() < endSearchTime.getTime()
      ) {
        // If outside working hours, advance search pointer to the next working hour start slot
        if (!isWithinWorkingHours(searchPtr)) {
          searchPtr.setMinutes(searchPtr.getMinutes() + 5);
          continue;
        }

        // Find the length of the current free contiguous work hours block
        const blockStart = new Date(searchPtr.getTime());
        const blockEnd = new Date(searchPtr.getTime());

        while (
          isWithinWorkingHours(blockEnd) &&
          !isOverlapping(
            blockEnd.getTime(),
            blockEnd.getTime() + 5 * 60 * 1000,
          ) &&
          blockEnd.getTime() < endSearchTime.getTime()
        ) {
          blockEnd.setMinutes(blockEnd.getMinutes() + 5);
          // Limit contiguous block size to remaining duration
          if (
            (blockEnd.getTime() - blockStart.getTime()) / 60000 >=
            remainingDuration
          ) {
            break;
          }
        }

        const blockDuration =
          (blockEnd.getTime() - blockStart.getTime()) / 60000;

        if (blockDuration >= 5) {
          // If the task is splitable, we schedule whatever fits (min block size constraint check)
          if (isSplitable) {
            // We can schedule this chunk
            const chunkDuration = Math.min(blockDuration, remainingDuration);

            // Check if chunk is at least minBlock or if it is the last remaining part of the task
            if (
              chunkDuration >= minBlock ||
              chunkDuration === remainingDuration
            ) {
              const endTimeVal = new Date(
                blockStart.getTime() + chunkDuration * 60000,
              );

              generatedFocusBlocks.push({
                id: uuidv4(),
                userId,
                taskId: task.id,
                startTime: blockStart,
                endTime: endTimeVal,
                blockType: 'Focus_Block',
                source: 'App',
                isLocked: false,
                title: task.title,
              });

              if (!taskFirstStart) taskFirstStart = blockStart;
              taskLastEnd = endTimeVal;

              remainingDuration -= chunkDuration;
              fixedIntervals.push({
                start: blockStart.getTime(),
                end: endTimeVal.getTime(),
              });

              searchPtr = new Date(endTimeVal.getTime());
              continue;
            }
          } else {
            // Task is not splitable, must fit the entire duration in one block
            if (blockDuration >= remainingDuration) {
              const endTimeVal = new Date(
                blockStart.getTime() + remainingDuration * 60000,
              );

              generatedFocusBlocks.push({
                id: uuidv4(),
                userId,
                taskId: task.id,
                startTime: blockStart,
                endTime: endTimeVal,
                blockType: 'Focus_Block',
                source: 'App',
                isLocked: false,
                title: task.title,
              });

              taskFirstStart = blockStart;
              taskLastEnd = endTimeVal;

              remainingDuration = 0;
              fixedIntervals.push({
                start: blockStart.getTime(),
                end: endTimeVal.getTime(),
              });

              searchPtr = new Date(endTimeVal.getTime());
              continue;
            }
          }
        }

        // Advance search pointer
        searchPtr.setMinutes(searchPtr.getMinutes() + 5);
      }

      // Update task with its new estimated start and end dates
      if (taskFirstStart && taskLastEnd) {
        taskUpdates.push({
          id: task.id,
          updates: {
            estimated_start_date: taskFirstStart,
            estimated_end_date: taskLastEnd,
            status: 'Scheduled',
          },
        });
      } else {
        console.warn(
          `[SCHEDULER] Could not schedule task: "${task.title}" within the 14-day limit.`,
        );
      }
    }

    // 7. Write all generated focus blocks to DB
    if (generatedFocusBlocks.length > 0) {
      await this.timeBlocksService.createMany(generatedFocusBlocks);
    }

    // 8. Update tasks in the DB
    const batch = this.firebaseService.db.batch();
    taskUpdates.forEach((tu) => {
      const ref = this.firebaseService.db.collection('tasks').doc(tu.id);
      batch.update(ref, {
        ...tu.updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    console.log(
      `[SCHEDULER] Completed scheduling. Created ${generatedFocusBlocks.length} Focus Blocks.`,
    );
  }

  /**
   * Apply scheduling results from the new Motion-style scheduler to the database.
   * This converts the new architecture results back to the legacy format for storage.
   */
  private async applySchedulingResults(
    result: SchedulingResult,
    userId: string,
  ): Promise<void> {
    console.log(`[SCHEDULER] Applying scheduling results to database`);

    // 1. Delete existing unlocked focus blocks for scheduled tasks
    await this.timeBlocksService.deleteManyFocusBlocks(userId);

    // 2. Create new work blocks from scheduling results
    const newTimeBlocks: ITimeBlock[] = [];

    for (const scheduledTask of result.scheduledTasks) {
      for (const workBlock of scheduledTask.workBlocks) {
        newTimeBlocks.push({
          id: workBlock.id,
          userId,
          taskId: workBlock.taskId || scheduledTask.taskId,
          startTime: workBlock.start,
          endTime: workBlock.end,
          blockType: 'Focus_Block',
          source: 'App',
          isLocked: workBlock.isLocked,
          title: `Focus Block`,
          createdAt: workBlock.createdAt,
        });
      }
    }

    // 3. Write new time blocks to database
    if (newTimeBlocks.length > 0) {
      await this.timeBlocksService.createMany(newTimeBlocks);
    }

    // 4. Update tasks with new scheduling information
    const batch = this.firebaseService.db.batch();

    for (const scheduledTask of result.scheduledTasks) {
      const taskRef = this.firebaseService.db
        .collection('tasks')
        .doc(scheduledTask.taskId);

      // Calculate start and end from work blocks
      const workBlocks = scheduledTask.workBlocks;
      if (workBlocks.length > 0) {
        const sortedBlocks = [...workBlocks].sort(
          (a, b) => a.start.getTime() - b.start.getTime(),
        );

        const firstBlock = sortedBlocks[0];
        const lastBlock = sortedBlocks[sortedBlocks.length - 1];

        batch.update(taskRef, {
          estimated_start_date: admin.firestore.Timestamp.fromDate(
            firstBlock.start,
          ),
          estimated_end_date: admin.firestore.Timestamp.fromDate(lastBlock.end),
          status: 'Scheduled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    console.log(
      `[SCHEDULER] Applied ${newTimeBlocks.length} work blocks to database`,
    );
  }
}
