import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  IsOptional,
} from 'class-validator';
import { SubtaskInput } from '../entities/task.entity';

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
  subtasks: SubtaskInput[];

  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}
