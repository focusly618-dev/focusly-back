import { Module, forwardRef } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { FoldersResolver } from './folders.resolver';
import { FirebaseModule } from '../../firebase/firebase.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => WorkspacesModule)],
  providers: [FoldersResolver, FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
