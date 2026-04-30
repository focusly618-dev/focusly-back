import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
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

  @Field(() => [TaskLink], { defaultValue: [] })
  links: TaskLink[];

  @Field(() => [Collaborator], { defaultValue: [], nullable: true })
  collaborators?: Collaborator[];
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
}
