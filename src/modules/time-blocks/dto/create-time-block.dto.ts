import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class CreateTimeBlockDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  taskId?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsEnum(['Focus_Block', 'Break', 'External_Event'])
  @IsNotEmpty()
  blockType: 'Focus_Block' | 'Break' | 'External_Event';

  @IsString()
  @IsOptional()
  externalEventId?: string;

  @IsEnum(['App', 'Google', 'Outlook'])
  @IsNotEmpty()
  source: 'App' | 'Google' | 'Outlook';

  @IsBoolean()
  isLocked: boolean;
}
