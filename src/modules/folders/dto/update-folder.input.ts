import { CreateFolderInput } from './create-folder.input';
import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class UpdateFolderInput extends PartialType(CreateFolderInput) {
  @Field(() => ID)
  @IsString()
  id: string;
}
