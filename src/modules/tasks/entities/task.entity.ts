import { Field, ID, Int, ObjectType, InputType } from '@nestjs/graphql';
import { Tag } from '../../tags/entities/tag.entity';
import { TaskStatus } from './task-status.enum';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@ObjectType()
export class TaskFilters {
  @Field(() => TaskStatus, { nullable: true })
  status?: TaskStatus;

  @Field(() => Int, { nullable: true })
  priorityLevel?: number;

  @Field({ nullable: true })
  category?: string;
}

@ObjectType()
export class Subtask {
  @Field(() => ID)
  id: string;

  @Field({ name: 'user_id', nullable: true })
  userId?: string;

  @Field()
  title: string;

  @Field({ name: 'notes_encrypted', nullable: true })
  notesEncrypted?: string;

  @Field(() => Int, { name: 'estimate_timer', nullable: true })
  estimateTimer?: number;

  @Field(() => Int, { name: 'real_timer', nullable: true })
  realTimer?: number;

  @Field(() => Int, { name: 'priority_level', nullable: true })
  priorityLevel?: number;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  deadline?: Date;

  @Field({ nullable: true })
  status?: string;

  @Field({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  duration?: Date;

  @Field({ name: 'created_at', nullable: true })
  createdAt?: Date;

  @Field({ name: 'updated_at', nullable: true })
  updatedAt?: Date;

  @Field({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Field(() => [Tag], { defaultValue: [] })
  tags: Tag[];

  @Field(() => [TaskLink], { defaultValue: [] })
  links: TaskLink[];
}

@InputType()
export class SubtaskInput {
  @Field()
  title: string;

  @Field({ name: 'notes_encrypted', nullable: true })
  notesEncrypted?: string;

  @Field(() => Int, { name: 'estimate_timer', nullable: true })
  estimateTimer?: number;

  @Field(() => Int, { name: 'real_timer', nullable: true })
  realTimer?: number;

  @Field(() => Int, { name: 'priority_level', nullable: true })
  priorityLevel?: number;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  deadline?: string;

  @Field({ nullable: true })
  status?: string;

  @Field({ name: 'completed_at', nullable: true })
  completedAt?: string;

  @Field({ nullable: true })
  duration?: string;

  @Field({ name: 'created_at', nullable: true })
  createdAt?: string;

  @Field({ name: 'updated_at', nullable: true })
  updatedAt?: string;

  @Field({ name: 'deleted_at', nullable: true })
  deletedAt?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [TaskLink], { nullable: true })
  links?: TaskLink[];
}

@ObjectType()
export class TaskLink {
  @Field()
  title: string;

  @Field()
  url: string;
}

@ObjectType()
export class Collaborator {
  @Field()
  email: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  avatar?: string;
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

  @Field(() => [Collaborator], { defaultValue: [], nullable: true })
  collaborators?: Collaborator[];

  @Field({ name: 'google_event_id', nullable: true })
  googleEventId?: string;

  @Field({ name: 'task_type', nullable: true })
  taskType?: string;

  @Field({ name: 'estimated_start_date', nullable: true })
  estimatedStartDate?: Date;

  @Field({ name: 'estimated_end_date', nullable: true })
  estimatedEndDate?: Date;
}
