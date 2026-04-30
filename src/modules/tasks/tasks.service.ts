import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ITask } from './interfaces/task.interface';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { TaskFilterInput, TaskSortInput } from './schemas/task.inputs';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Injectable()
export class TasksService {
  private collection: admin.firestore.CollectionReference;

  constructor(
    private firebaseService: FirebaseService,
    private googleCalendarService: GoogleCalendarService,
  ) {
    this.collection = this.firebaseService.db.collection('tasks');
  }

  async create(taskData: Partial<ITask>): Promise<ITask> {
    // If google_event_id is present, check for existing task to avoid duplicates (Upsert)
    if (taskData.google_event_id && taskData.userId) {
      const existing = await this.collection
        .where('userId', '==', taskData.userId)
        .where('google_event_id', '==', taskData.google_event_id)
        .where('deletedAt', '==', null)
        .limit(1)
        .get();

      if (!existing.empty) {
        const doc = existing.docs[0];
        console.log(
          `[UPSERT] Task with google_event_id ${taskData.google_event_id} already exists (ID: ${doc.id}). Updating instead of creating.`,
        );
        return this.update(doc.id, taskData);
      }
    }

    const id = uuidv4();
    const docRef = this.collection.doc(id);
    const now = new Date();

    const task: ITask = {
      ...taskData,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
      tags: taskData.tags,
      subtasks: taskData.subtasks?.map((s) => ({ ...s })) || [],
    } as ITask;

    const cleanedData = this.sanitizeData({
      ...taskData,
      id: docRef.id,
      deletedAt: null,
      notified: false,
      lastMinuteNotified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await docRef.set(cleanedData);

    return task;
  }

  /**
   * Retrieves all google_event_ids for tasks that have not been deleted.
   * Useful for deduplication when fetching events from Google Calendar.
   */
  async getSyncedGoogleIds(userId: string): Promise<string[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('deletedAt', '==', null)
      .get();

    return snapshot.docs
      .map((doc) => doc.data().google_event_id as string)
      .filter(Boolean);
  }

  async findAll(): Promise<ITask[]> {
    const snapshot = await this.collection.where('deletedAt', '==', null).get();
    return snapshot.docs.map((doc) => this.mapToTask(doc.data()));
  }

  async filterByStatus(
    filters: TaskFilterInput,
    sort?: TaskSortInput,
  ): Promise<ITask[]> {
    const snapshot = await this.collection.where('deletedAt', '==', null).get();
    let tasks = snapshot.docs.map((doc) => this.mapToTask(doc.data()));

    if (filters.status) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      tasks = tasks.filter((t) => t.status === filters.status);
    }
    if (filters.priorityLevel) {
      tasks = tasks.filter((t) => t.priorityLevel === filters.priorityLevel);
    }
    if (filters.category) {
      tasks = tasks.filter((t) => t.category === filters.category);
    }

    if (sort && sort.sort) {
      const fieldMap: Record<string, keyof ITask> = {
        deadline: 'deadline',
        priority_level: 'priorityLevel',
        estimate_minutes: 'estimateTimer',
        created_at: 'createdAt',
      };
      const field = fieldMap[sort.sort] || (sort.sort as keyof ITask);
      const direction = sort.order?.toLowerCase() === 'desc' ? -1 : 1;

      tasks.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
      });
    }

    return tasks;
  }

  async findUpcomingTasks(startDate: Date, endDate: Date): Promise<ITask[]> {
    const snapshot = await this.collection
      .where('deadline', '>=', startDate)
      .where('deadline', '<=', endDate)
      .where('notified', '==', false)
      .where('deletedAt', '==', null)
      .get();

    return snapshot.docs.map((doc) => this.mapToTask(doc.data()));
  }

  async findLastMinuteTasks(startDate: Date, endDate: Date): Promise<ITask[]> {
    const snapshot = await this.collection
      .where('deadline', '>=', startDate)
      .where('deadline', '<=', endDate)
      .where('lastMinuteNotified', '==', false)
      .where('deletedAt', '==', null)
      .get();

    return snapshot.docs.map((doc) => this.mapToTask(doc.data()));
  }

  async markAsNotified(id: string): Promise<void> {
    await this.collection.doc(id).update({ notified: true });
  }

  async markAsLastMinuteNotified(id: string): Promise<void> {
    await this.collection.doc(id).update({ lastMinuteNotified: true });
  }

  async findAllByUser(
    userId: string,
    filters?: TaskFilterInput,
    sort?: TaskSortInput,
  ): Promise<ITask[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('deletedAt', '==', null)
      .get();

    let tasks = snapshot.docs.map((doc) => this.mapToTask(doc.data()));

    if (filters) {
      if (filters.status) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        tasks = tasks.filter((t) => t.status === filters.status);
      }
      if (filters.priorityLevel) {
        tasks = tasks.filter((t) => t.priorityLevel === filters.priorityLevel);
      }
      if (filters.category) {
        tasks = tasks.filter((t) => t.category === filters.category);
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        tasks = tasks.filter(
          (t) => t.deadline && new Date(t.deadline).getTime() >= start,
        );
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate).getTime();
        tasks = tasks.filter(
          (t) => t.deadline && new Date(t.deadline).getTime() <= end,
        );
      }
    }

    if (sort && sort.sort) {
      const fieldMap: Record<string, keyof ITask> = {
        deadline: 'deadline',
        priority_level: 'priorityLevel',
        estimate_minutes: 'estimateTimer',
        created_at: 'createdAt',
      };
      const field = fieldMap[sort.sort] || (sort.sort as keyof ITask);
      const direction = sort.order?.toLowerCase() === 'desc' ? -1 : 1;

      tasks.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        if (valA instanceof Date) valA = valA.getTime() as any;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        if (valB instanceof Date) valB = valB.getTime() as any;

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
      });
    }

    return tasks;
  }

  async findOne(id: string): Promise<ITask> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return this.mapToTask(doc.data()!);
  }

  async update(id: string, updateData: Partial<ITask>): Promise<ITask> {
    const docRef = this.collection.doc(id);
    const sanitizedUpdate = this.sanitizeData(updateData);

    if (updateData.deadline) {
      sanitizedUpdate.notified = false;
      sanitizedUpdate.lastMinuteNotified = false;
    }

    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        ...sanitizedUpdate,
        id: id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedAt: null,
      });
    } else {
      await docRef.update({
        ...sanitizedUpdate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const updatedDoc = await docRef.get();
    return this.mapToTask(updatedDoc.data()!);
  }

  // Cambiamos 'Record<string, unknown>' por un genérico 'T extends object'
  async addSubtask<T extends object>(id: string, subtask: T): Promise<ITask> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const taskData = doc.data();
    const currentSubtasks =
      (taskData?.subtasks as Record<string, unknown>[]) || [];

    // this.sanitizeData se encargará de convertir tu SubtaskInput en un objeto plano para Firestore
    const newSubtasks = [...currentSubtasks, this.sanitizeData(subtask)];

    await docRef.update({
      subtasks: newSubtasks,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return docRef.get().then((d) => this.mapToTask(d.data()!));
  }

  async delete(id: string): Promise<void> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const taskData = doc.data() as ITask;
    const taskType = taskData.task_type || 'PlatformTask';

    console.log(`[DELETE] Deleting ${taskType} with ID: ${id}`);

    // If this PlatformTask was synced with Google Calendar, also delete the event there
    if (
      taskType === 'PlatformTask' &&
      taskData.google_event_id &&
      taskData.userId
    ) {
      try {
        console.log(
          `[DELETE] PlatformTask has google_event_id: ${taskData.google_event_id}, syncing deletion to Google Calendar`,
        );
        await this.googleCalendarService.deleteEvent(
          taskData.userId,
          taskData.google_event_id,
        );
      } catch (error) {
        console.error(
          '[DELETE] Failed to delete synced Google Calendar event:',
          error instanceof Error ? error.message : String(error),
        );
        // Continue with local deletion even if Google fails
      }
    }

    // Clean up workspace references
    const workspacesSnapshot = await this.firebaseService.db
      .collection('workspaces')
      .where('taskId', '==', id)
      .get();

    if (!workspacesSnapshot.empty) {
      const batch = this.firebaseService.db.batch();
      workspacesSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          taskId: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }
    // Finally, perform a soft delete by setting deletedAt
    await docRef.update({
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(
      `[DELETE] ${taskType} with ID: ${id} soft-deleted successfully`,
    );
  }

  async deleteWorkspaceTasks(workspaceId: string): Promise<void> {
    const snapshot = await this.collection
      .where('workspaceId', '==', workspaceId)
      .get();

    if (snapshot.empty) return;

    // Sync deletions with Google Calendar for PlatformTasks that were synced
    for (const doc of snapshot.docs) {
      const taskData = doc.data() as ITask;
      const taskType = taskData.task_type || 'PlatformTask';

      if (
        taskType === 'PlatformTask' &&
        taskData.google_event_id &&
        taskData.userId
      ) {
        try {
          console.log(
            `[DELETE] Syncing workspace task deletion to Google Calendar: ${taskData.google_event_id}`,
          );
          await this.googleCalendarService.deleteEvent(
            taskData.userId,
            taskData.google_event_id,
          );
        } catch (error) {
          console.error(
            '[DELETE] Failed to delete synced Google Calendar event:',
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    const batch = this.firebaseService.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  private sanitizeData<T>(data: T): T {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    if (data instanceof Date || data instanceof admin.firestore.FieldValue) {
      return data;
    }

    if (Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return data.map((item) => this.sanitizeData(item)) as unknown as T;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = this.sanitizeData(value);
      }
    }
    return sanitized as T;
  }

  private mapToTask(data: admin.firestore.DocumentData): ITask {
    const convertDate = (val: unknown): Date | undefined => {
      if (!val) return undefined;
      if (val instanceof admin.firestore.Timestamp) {
        return val.toDate();
      }
      if (val instanceof Date) {
        return isNaN(val.getTime()) ? undefined : val;
      }
      if (typeof val === 'string') {
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : date;
      }
      return undefined;
    };

    const subtasksRaw = (data.subtasks as Record<string, unknown>[]) || [];

    return {
      ...data,
      deadline: convertDate(data.deadline),
      createdAt: convertDate(data.createdAt)!,
      updatedAt: convertDate(data.updatedAt)!,
      completedAt: convertDate(data.completedAt),
      deletedAt: convertDate(data.deletedAt),
      duration: convertDate(data.duration),
      estimated_start_date: convertDate(data.estimated_start_date),
      estimated_end_date: convertDate(data.estimated_end_date),
      subtasks: subtasksRaw.map((s) => ({
        title: (s.title as string) || 'Untitled',
        completed: (s.completed as boolean) || false,
        timer: (s.timer as number) || 0,
        notesEncrypted: s.notesEncrypted as string | undefined,
        estimateTimer: s.estimateTimer as number | undefined,
        priorityLevel: s.priorityLevel as string | undefined,
        status: s.status as string | undefined,
        deadline: convertDate(s.deadline),
        category: s.category as string | undefined,
      })),
      collaborators: (data.collaborators as any[]) || [],
      notified: (data.notified as boolean) || false,
    } as ITask;
  }
}
