import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { CreateTaskInput } from './create-task.input';
import { IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class UpdateTaskInput extends PartialType(CreateTaskInput) {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  id: string;
}
