import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Task } from '../../tasks/entities/task.entity';
import { Folder } from '../../folders/entities/folder.entity';

@ObjectType()
export class Workspace {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  taskId?: string;

  @Field(() => Task, { nullable: true })
  task?: Task;

  @Field()
  title: string;

  @Field({ nullable: true })
  folderId?: string;

  @Field(() => String, { description: 'JSON string of BlockNote content' })
  content: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  saveStatus: boolean;

  @Field()
  updatedAt: Date;

  @Field(() => Folder, { nullable: true })
  folder?: Folder;
}
