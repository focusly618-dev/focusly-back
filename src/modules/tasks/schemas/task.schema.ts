import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Tag } from '../../tags/entities/tag.entity';
import { TaskStatus } from './task-status.enum';
import { Workspace } from '../../workspaces/schemas/workspace.schema';

@ObjectType()
export class Collaborator {
  @Field({ nullable: true })
  name?: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  responseStatus?: string;
}

@ObjectType()
export class TaskFilters {
  @Field(() => [TaskStatus], { nullable: true })
  status?: TaskStatus[];

  @Field(() => [Int], { nullable: true })
  priorityLevel?: number[];

  @Field(() => [String], { nullable: true })
  category?: string[];
}

@ObjectType()
export class Subtask {
  @Field()
  title: string;

  @Field()
  completed: boolean;

  @Field(() => Int)
  timer: number;

  @Field({ name: 'notes_encrypted', nullable: true })
  notesEncrypted?: string;

  @Field(() => Int, { name: 'estimate_timer', nullable: true })
  estimateTimer?: number;

  @Field(() => Int, { name: 'priority_level', nullable: true })
  priorityLevel?: number;

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  deadline?: Date;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => [TaskLink], { defaultValue: [] })
  links: TaskLink[];
}

@ObjectType()
export class TaskLink {
  @Field()
  title: string;

  @Field()
  url: string;
}

@ObjectType()
export class Task {
  @Field(() => ID)
  id: string;

  @Field({ name: 'user_id' })
  userId: string;

  @Field()
  title: string;

  @Field({ name: 'notes_encrypted' })
  notesEncrypted: string;

  @Field(() => Int, { name: 'estimate_timer', nullable: true })
  estimateTimer?: number;

  @Field(() => Int, { name: 'real_timer', nullable: true })
  realTimer?: number;

  @Field(() => Int, { name: 'priority_level' })
  priorityLevel: number;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  color?: string;

  @Field()
  deadline: Date;

  @Field(() => TaskStatus)
  status: TaskStatus;

  @Field({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  duration?: Date;

  @Field(() => [Subtask])
  subtasks: Subtask[];

  @Field({ name: 'created_at' })
  createdAt: Date;

  @Field({ name: 'updated_at' })
  updatedAt: Date;

  @Field({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Field(() => [Tag], { defaultValue: [] })
  tags: Tag[];

  @Field(() => TaskFilters, { nullable: true })
  filters?: TaskFilters;

  @Field(() => Workspace, { nullable: true })
  workspace?: Workspace;

  @Field(() => [TaskLink], { defaultValue: [] })
  links: TaskLink[];

  @Field({ name: 'task_type', nullable: true })
  task_type?: string;

  @Field({ name: 'google_event_id', nullable: true })
  googleEventId?: string;

  @Field(() => Date, { name: 'estimated_start_date', nullable: true })
  estimated_start_date?: Date;

  @Field(() => Date, { name: 'estimated_end_date', nullable: true })
  estimated_end_date?: Date;

  @Field(() => [Collaborator], { defaultValue: [], nullable: true })
  collaborators?: Collaborator[];

  @Field({ name: 'use_ai', nullable: true })
  use_ai?: boolean;

  @Field({ name: 'is_splitable', nullable: true })
  isSplitable?: boolean;

  @Field(() => Int, { name: 'min_block_duration', nullable: true })
  minBlockDuration?: number;

  @Field({ name: 'preferred_time_of_day', nullable: true })
  preferredTimeOfDay?: string;

  @Field({ name: 'is_locked', nullable: true })
  isLocked?: boolean;
}
