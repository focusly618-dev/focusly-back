import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class CreateWorkspaceInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  taskId?: string | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  folderId?: string;

  @Field()
  @IsString()
  title: string;

  @Field()
  @IsString()
  content: string;

  @Field()
  @IsBoolean()
  saveStatus: boolean;
}

@InputType()
export class UpdateWorkspaceInput extends PartialType(CreateWorkspaceInput) {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  taskId?: string | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  folderId?: string;
}
