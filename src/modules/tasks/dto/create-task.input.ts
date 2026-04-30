import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsString,
  IsInt,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../schemas/task-status.enum';

@InputType()
export class CollaboratorInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field()
  @IsString()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  responseStatus?: string;
}

@InputType()
export class SubtaskInput {
  @Field()
  @IsString()
  title: string;

  @Field()
  @IsBoolean()
  completed: boolean;

  @Field(() => Int)
  @IsInt()
  timer: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes_encrypted?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  estimate_timer?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  priority_level?: number;

  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  deadline?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => [LinkInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkInput)
  links?: LinkInput[];
}

@InputType()
export class LinkInput {
  @Field()
  @IsString()
  title: string;

  @Field()
  @IsString()
  url: string;
}

@InputType()
export class CreateTaskInput {
  @Field()
  @IsString()
  user_id: string;

  @Field()
  @IsString()
  title: string;

  @Field()
  @IsString()
  notes_encrypted: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  estimate_timer?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  real_timer?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  duration?: string;

  @Field(() => Int)
  @IsInt()
  priority_level: number;

  @Field()
  @IsString()
  deadline: string;

  @Field()
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Field(() => [SubtaskInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubtaskInput)
  subtasks: SubtaskInput[];

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @Field(() => [LinkInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkInput)
  links?: LinkInput[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  google_event_id?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  estimated_start_date?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  estimated_end_date?: string;

  @Field(() => [CollaboratorInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollaboratorInput)
  collaborators?: CollaboratorInput[];
}

@InputType()
export class TaskFilterInput {
  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsInt() // Changed to IsInt for consistency with CreateTaskInput, or IsNumber if float allowed? Usually priority is int.
  priorityLevel?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  category?: string;
}

@InputType()
export class TaskSortInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sort?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  order?: string;
}
