export interface ITask {
  id: string;
  userId: string;
  title: string;
  notesEncrypted: string;
  estimateTimer?: number;
  realTimer?: number;
  duration?: Date;
  priorityLevel: number;
  category?: string;
  color?: string;
  estimated_start_date?: Date;
  estimated_end_date?: Date;
  deadline: Date;
  status:
    | 'Todo'
    | 'Planning'
    | 'Pending'
    | 'On Hold'
    | 'Review'
    | 'Done'
    | 'Backlog'
    | 'Scheduled'
    | 'Archived';
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  tags: { name: string }[];
  filters?: {
    priority: string[];
    category: string[];
    status: string[];
  };
  links?: { title: string; url: string }[];
  task_type?: 'PlatformTask' | 'GoogleTask';
  google_event_id?: string;
  source?: 'google' | 'platform';
  sync_status?: 'synced' | 'pending' | 'error';
  collaborators?: {
    name?: string;
    email: string;
    avatar?: string;
    responseStatus?: string;
  }[];
  notified?: boolean;
  lastMinuteNotified?: boolean;
  use_ai?: boolean;
  _changed?: boolean;
}
