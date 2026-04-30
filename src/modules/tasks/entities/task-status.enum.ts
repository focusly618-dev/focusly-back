import { registerEnumType } from '@nestjs/graphql';

export enum TaskStatus {
  Todo = 'Todo',
  Planning = 'Planning',
  Pending = 'Pending',
  OnHold = 'On Hold',
  Review = 'Review',
  Done = 'Done',
  Backlog = 'Backlog', // Keeping for legacy if needed, or remove
  Scheduled = 'Scheduled',
  Archived = 'Archived',
}

registerEnumType(TaskStatus, {
  name: 'TaskStatus',
});
