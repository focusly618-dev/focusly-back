import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateFocusSessionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsDateString()
  @IsNotEmpty()
  startedAt: string;

  @IsDateString()
  @IsNotEmpty()
  endedAt: string;

  @IsNumber()
  durationMinutes: number;

  @IsNumber()
  distractionCount: number;

  @IsBoolean()
  wasSuccessful: boolean;
}
