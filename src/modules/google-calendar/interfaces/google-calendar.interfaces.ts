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
    displayName?: string;
    email?: string;
    responseStatus?: string;
  }[];
  organizer?: {
    email?: string;
    self?: boolean;
  };
  location?: string;
  colorId?: string;
}

export interface ProcessedGoogleTask {
  id: string;
  google_event_id?: string;
  title: string;
  notes_encrypted: string;
  deadline: string;
  estimated_start_date: string;
  estimated_end_date?: string;
  status: ITask['status'];
  priority_level: number;
  subtasks: any[];
  tags: any[];
  links: { title: string; url: string }[];
  estimate_timer?: number;
  task_type?: 'PlatformTask' | 'GoogleTask';
  collaborators?: {
    name?: string;
    email: string;
    responseStatus?: string;
    avatar?: string;
  }[];
  organizer_email?: string;
  location?: string;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
}
