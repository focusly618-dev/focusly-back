import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
} from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  notesEncrypted: string;

  @IsNumber()
  estimateMinutes: number;

  @IsNumber()
  priorityLevel: number;

  @IsDateString()
  @IsNotEmpty()
  deadline: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subtasks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsEnum(['Backlog', 'Scheduled', 'Done', 'Archived'])
  status: 'Backlog' | 'Scheduled' | 'Done' | 'Archived';
}
