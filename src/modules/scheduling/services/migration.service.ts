import { Injectable } from '@nestjs/common';
import {
  ExternalCalendarEvent,
  Meeting,
  Task as NewTask,
  WorkBlock as NewWorkBlock,
  SchedulingConstraints,
} from '../domain/scheduling-entities.types';
import { ITask } from '../../tasks/interfaces/task.interface';
import { ITimeBlock } from '../../time-blocks/interfaces/time-block.interface';

/**
 * MIGRATION SERVICE
 *
 * This service handles the migration from the old architecture (everything as Task)
 * to the new Motion-style architecture (separated entities).
 */
@Injectable()
export class MigrationService {
  /**
   * Migrate a legacy Task to the appropriate new entity type.
   */
  migrateTask(task: ITask): {
    externalEvent?: ExternalCalendarEvent;
    meeting?: Meeting;
    task?: NewTask;
    workBlock?: NewWorkBlock;
  } {
    const result: {
      externalEvent?: ExternalCalendarEvent;
      meeting?: Meeting;
      task?: NewTask;
      workBlock?: NewWorkBlock;
    } = {};

    // 1. If task has google_event_id and source is 'google', migrate to ExternalCalendarEvent
    if (task.google_event_id && task.source === 'google') {
      result.externalEvent = this.migrateToExternalEvent(task);
      return result;
    }

    // 2. If task is a meeting (has collaborators or meeting link), migrate to Meeting
    if (this.isMeeting(task)) {
      result.meeting = this.migrateToMeeting(task);
      return result;
    }

    // 3. If task is locked and has estimated dates, migrate to WorkBlock
    if (task.isLocked && task.estimated_start_date && task.estimated_end_date) {
      result.workBlock = this.migrateToWorkBlock(task);
      return result;
    }

    // 4. Otherwise, migrate to new Task structure
    result.task = this.migrateToNewTask(task);
    return result;
  }

  /**
   * Migrate legacy TimeBlock to new WorkBlock.
   */
  migrateTimeBlock(timeBlock: ITimeBlock): NewWorkBlock {
    return {
      id: timeBlock.id,
      userId: timeBlock.userId,
      taskId: timeBlock.taskId,
      start: timeBlock.startTime,
      end: timeBlock.endTime,
      duration:
        (timeBlock.endTime.getTime() - timeBlock.startTime.getTime()) / 60000,
      blockType: this.mapBlockType(timeBlock.blockType),
      isLocked: timeBlock.isLocked,
      isGenerated: timeBlock.source === 'App',
      createdAt: timeBlock.createdAt,
      updatedAt: new Date(),
    };
  }

  /**
   * Migrate a legacy Task to ExternalCalendarEvent.
   */
  private migrateToExternalEvent(task: ITask): ExternalCalendarEvent {
    // Extract conference data from links
    const conferenceData = this.extractConferenceData(task.links || []);

    return {
      id: task.id,
      provider: 'google',
      providerEventId: task.google_event_id || task.id,
      title: task.title,
      description: task.notesEncrypted,
      start: task.estimated_start_date || new Date(),
      end: task.deadline,
      isAllDay: false, // Would need to determine this from task data
      location: undefined, // Would need to extract from task data
      conferenceData,
      attendees: (task.collaborators || []).map((c) => ({
        email: c.email,
        name: c.name,
        responseStatus: this.mapResponseStatus(c.responseStatus),
        avatar: c.avatar,
      })),
      organizer:
        task.collaborators && task.collaborators.length > 0
          ? {
              email: task.collaborators[0].email || '',
              name: task.collaborators[0].name || '',
              isSelf: true, // Would need to determine this
            }
          : undefined,
      source: 'external',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Migrate a legacy Task to Meeting.
   */
  private migrateToMeeting(task: ITask): Meeting {
    const meetingUrl = this.extractMeetingUrl(task.links || []);

    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.notesEncrypted,
      start: task.estimated_start_date || new Date(),
      end: task.deadline,
      isAllDay: false,
      location: undefined,
      meetingType: meetingUrl ? 'virtual' : 'in_person',
      meetingUrl,
      attendees: (task.collaborators || []).map((c) => ({
        email: c.email,
        name: c.name,
        responseStatus: this.mapResponseStatus(c.responseStatus),
        avatar: c.avatar,
      })),
      isLocked: task.isLocked || false,
      isRecurring: false, // Would need to determine this
      recurrenceRule: undefined,
      source: task.source === 'google' ? 'external' : 'manual',
      externalEventId: task.google_event_id,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Migrate a legacy Task to new Task structure.
   */
  private migrateToNewTask(task: ITask): NewTask {
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.notesEncrypted,
      priority: this.mapPriority(task.priorityLevel),
      priorityValue: task.priorityLevel,
      urgency: this.mapUrgency(task.deadline),
      deadline: task.deadline,
      hardDeadline: undefined, // Would need to determine this
      estimatedDuration: task.estimateTimer || 30,
      isSplitable: task.isSplitable !== false,
      minBlockDuration: task.minBlockDuration || 30,
      maxBlockDuration: undefined,
      preferredTimeOfDay: this.mapPreferredTimeOfDay(task.preferredTimeOfDay),
      preferredDays: undefined,
      status: this.mapStatus(task.status),
      subtasks: (task.subtasks || []).map((st, idx) => ({
        id: `${task.id}_sub_${idx}`,
        title: st.title,
        completed: st.completed,
        estimatedDuration: st.estimateTimer || 30,
      })),
      dependsOnTaskIds: [],
      blocksTaskIds: [],
      category: task.category,
      tags: (task.tags || []).map((t) => (typeof t === 'string' ? t : t.name)),
      color: task.color,
      source: task.use_ai ? 'ai_suggested' : 'manual',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
    };
  }

  /**
   * Migrate a legacy Task to WorkBlock.
   */
  private migrateToWorkBlock(task: ITask): NewWorkBlock {
    return {
      id: `wb_${task.id}`,
      userId: task.userId,
      taskId: task.id,
      start: task.estimated_start_date || new Date(),
      end: task.estimated_end_date || task.deadline,
      duration: task.estimateTimer || 30,
      blockType: 'focus',
      isLocked: task.isLocked || false,
      isGenerated: false,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Determine if a task is a meeting.
   */
  private isMeeting(task: ITask): boolean {
    // Has collaborators
    if (task.collaborators && task.collaborators.length > 0) {
      return true;
    }

    // Has meeting link
    if (task.links && task.links.some((link) => this.isMeetingLink(link.url))) {
      return true;
    }

    return false;
  }

  /**
   * Check if a URL is a meeting link.
   */
  private isMeetingLink(url: string): boolean {
    const meetingDomains = [
      'meet.google.com',
      'zoom.us',
      'teams.microsoft.com',
      'webex.com',
      'skype.com',
    ];
    return meetingDomains.some((domain) => url.includes(domain));
  }

  /**
   * Extract conference data from task links.
   */
  private extractConferenceData(
    links: { title: string; url: string }[],
  ): ExternalCalendarEvent['conferenceData'] {
    const meetingLink = links.find((link) => this.isMeetingLink(link.url));
    if (!meetingLink) return undefined;

    if (meetingLink.url.includes('meet.google.com')) {
      return {
        type: 'google_meet',
        uri: meetingLink.url,
        hangoutLink: meetingLink.url,
      };
    } else if (meetingLink.url.includes('zoom.us')) {
      return {
        type: 'zoom',
        uri: meetingLink.url,
      };
    } else if (meetingLink.url.includes('teams.microsoft.com')) {
      return {
        type: 'teams',
        uri: meetingLink.url,
      };
    }

    return {
      type: 'other',
      uri: meetingLink.url,
    };
  }

  /**
   * Extract meeting URL from task links.
   */
  private extractMeetingUrl(
    links: { title: string; url: string }[],
  ): string | undefined {
    const meetingLink = links.find((link) => this.isMeetingLink(link.url));
    return meetingLink?.url;
  }

  /**
   * Map response status from legacy to new format.
   */
  private mapResponseStatus(
    status?: string,
  ): 'accepted' | 'declined' | 'tentative' | 'needsAction' {
    if (!status) return 'needsAction';
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'accepted';
      case 'declined':
        return 'declined';
      case 'tentative':
        return 'tentative';
      default:
        return 'needsAction';
    }
  }

  /**
   * Map priority level to priority string.
   */
  private mapPriority(level: number): NewTask['priority'] {
    if (level >= 4) return 'critical';
    if (level === 3) return 'high';
    if (level === 2) return 'medium';
    return 'low';
  }

  /**
   * Map deadline to urgency.
   */
  private mapUrgency(deadline?: Date): NewTask['urgency'] {
    if (!deadline) return 'flexible';

    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 0) return 'immediate';
    if (diffHours < 24) return 'today';
    if (diffDays < 7) return 'this_week';
    if (diffDays < 30) return 'this_month';
    return 'flexible';
  }

  /**
   * Map preferred time of day.
   */
  private mapPreferredTimeOfDay(
    preferred?: string,
  ): NewTask['preferredTimeOfDay'] {
    if (!preferred) return 'any';
    switch (preferred.toLowerCase()) {
      case 'morning':
        return 'morning';
      case 'afternoon':
        return 'afternoon';
      case 'evening':
        return 'evening';
      default:
        return 'any';
    }
  }

  /**
   * Map status from legacy to new format.
   */
  private mapStatus(status: ITask['status']): NewTask['status'] {
    switch (status) {
      case 'Todo':
        return 'backlog';
      case 'Planning':
        return 'planned';
      case 'Pending':
      case 'Scheduled':
        return 'scheduled';
      case 'On Hold':
        return 'backlog';
      case 'Review':
        return 'in_progress';
      case 'Done':
        return 'completed';
      case 'Backlog':
        return 'backlog';
      case 'Archived':
        return 'cancelled';
      default:
        return 'backlog';
    }
  }

  /**
   * Map block type from legacy to new format.
   */
  private mapBlockType(
    blockType: ITimeBlock['blockType'],
  ): NewWorkBlock['blockType'] {
    switch (blockType) {
      case 'Focus_Block':
        return 'focus';
      case 'Break':
        return 'break';
      case 'External_Event':
        return 'focus'; // External events should be handled separately
      case 'Meeting':
        return 'focus'; // Meetings should be handled separately
      default:
        return 'focus';
    }
  }

  /**
   * Create default scheduling constraints for a user.
   */
  createDefaultSchedulingConstraints(userId: string): SchedulingConstraints {
    return {
      userId,
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
      breakDuration: 15,
      breakInterval: 90,
      preferredFocusBlockDuration: 60,
      minFocusBlockDuration: 30,
      maxFocusBlockDuration: 120,
      schedulingStrategy: 'balanced',
      allowSameDaySplitting: true,
      allowOvertime: false,
      goldenWindow: {
        start: '09:00',
        end: '11:00',
      },
      updatedAt: new Date(),
    };
  }
}
