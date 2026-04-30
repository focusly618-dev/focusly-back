import { Module, forwardRef } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesResolver } from './workspaces.resolver';
import { FirebaseModule } from '../../firebase/firebase.module';
import { TasksModule } from '../tasks/tasks.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => TasksModule), forwardRef(() => FoldersModule)],
  providers: [WorkspacesResolver, WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
