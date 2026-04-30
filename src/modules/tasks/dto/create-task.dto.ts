import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  IsOptional,
} from 'class-validator';
import { TaskStatus } from '../entities/task-status.enum';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  notesEncrypted: string;

  @IsNumber()
  estimateMinutes: number;

  @IsOptional()
  @IsString()
  category: string;

  @IsNumber()
  priorityLevel: number;

  @IsDateString()
  @IsNotEmpty()
  deadline: string;

  @IsOptional()
  @IsEnum(['Backlog', 'Scheduled', 'Done', 'Archived'])
  status?: 'Backlog' | 'Scheduled' | 'Done' | 'Archived';

  @IsArray()
  @IsString({ each: true })
  subtasks: string[];

  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}

@InputType()
export class TaskFilterInput {
  @Field(() => TaskStatus, { nullable: true })
  status?: TaskStatus;

  @Field(() => Number, { nullable: true })
  priorityLevel?: number;

  @Field(() => String, { nullable: true })
  category?: string;
}
