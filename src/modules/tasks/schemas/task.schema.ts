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
}

@ObjectType()
export class PaginatedTasks {
  @Field(() => [Task])
  tasks: Task[];

  @Field(() => Int)
  totalCount: number;
}
