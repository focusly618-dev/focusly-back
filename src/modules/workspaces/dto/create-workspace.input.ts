import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateWorkspaceInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  taskId?: string;

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
