import { ITask } from '../../tasks/interfaces/task.interface';

export interface GoogleEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: {
      entryPointType?: string;
      uri?: string;
    }[];
  };
  attendees?: {
    email?: string;
    responseStatus?: string;
  }[];
  organizer?: {
    email?: string;
    self?: boolean;
  };
}

/**
 * Interface that represents the data structure of a Google task
 * after it has been processed by the pipeline, destined for the frontend.
 * It uses snake_case as required by the application's React components.
 */
export interface ProcessedGoogleTask {
  id: string;
  google_event_id?: string;
  title: string;
  notes_encrypted: string;
  deadline: string;
  estimated_start_date: string;
  status: ITask['status'];
  priority_level: number;
  subtasks: any[];
  tags: any[];
  links: { title: string; url: string }[];
  estimate_timer?: number;
  collaborators?: { email: string; responseStatus?: string; avatar?: string }[];
  organizer_email?: string;
  created_at: string;
  updated_at: string;
}

/**
 * A generic Pipeline engine to process data through a series of stages.
 */
export class Pipeline<TInput, TOutput> {
  private readonly stages: ((input: any) => any)[] = [];

  addStage<TNext>(stage: (input: TOutput) => TNext): Pipeline<TInput, TNext> {
    this.stages.push(stage);
    return this as unknown as Pipeline<TInput, TNext>;
  }

  execute(input: TInput): TOutput {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.stages.reduce((acc, stage) => stage(acc), input);
  }
}

/**
 * Specific Pipeline for Google Calendar Events to ITask conversion.
 * Returning fields in snake_case to match Frontend Task interface requirements.
 */
export const googleTaskPipeline = new Pipeline<
  GoogleEvent,
  ProcessedGoogleTask
>()
  // Stage 1: Basic Mapping
  .addStage((event: GoogleEvent): ProcessedGoogleTask => {
    const links: { title: string; url: string }[] = [];

    // Extract call link
    const conferenceLink = event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video',
    )?.uri;
    const callLink = event.hangoutLink || conferenceLink;

    if (callLink) {
      links.push({ title: 'Reunión de Google Meet', url: callLink });
    }

    const start = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
        ? new Date(event.start.date)
        : new Date();

    const deadline = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
        ? new Date(event.end.date)
        : new Date(start.getTime() + 30 * 60000);

    return {
      id: event.id || '',
      google_event_id: event.id,
      title: event.summary || 'Sin título',
      notes_encrypted: event.description || '',
      // We use ISO string for dates as the frontend expects string (deadline)
      deadline: deadline.toISOString(),
      estimated_start_date: start.toISOString(),
      status: 'Scheduled' as ITask['status'],
      priority_level: 3, // Default priority
      subtasks: [],
      tags: [],
      links,
      estimate_timer: Math.round(
        (deadline.getTime() - start.getTime()) / 60000,
      ),
      collaborators: event.attendees?.map((a) => ({
        email: a.email || '',
        responseStatus: a.responseStatus,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.email || 'User')}&background=random&color=fff`,
      })),
      organizer_email: event.organizer?.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  })
  // Stage 2: Clean HTML from description
  .addStage((task: ProcessedGoogleTask) => {
    if (task.notes_encrypted) {
      // Basic HTML stripping
      task.notes_encrypted = task.notes_encrypted.replace(/<[^>]*>?/gm, '');
      // Normalize whitespace
      task.notes_encrypted = task.notes_encrypted
        .replace(/&nbsp;/g, ' ')
        .trim();
    }
    return task;
  });
