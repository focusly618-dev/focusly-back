import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ID,
  Int,
} from '@nestjs/graphql';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { Workspace } from './schemas/workspace.schema';
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from './schemas/workspace.inputs';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { TasksService } from '../tasks/tasks.service';
import { Task } from '../tasks/schemas/task.schema';
import { ResolveField, Parent } from '@nestjs/graphql';
import { Folder } from '../folders/entities/folder.entity';
import { FoldersService } from '../folders/folders.service';
interface WorkspaceContext {
  req: {
    user: {
      userId: string;
    };
  };
}

@Resolver(() => Workspace)
@UseGuards(GqlAuthGuard)
export class WorkspacesResolver {
  constructor(
    private readonly workspacesService: WorkspacesService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => FoldersService))
    private readonly foldersService: FoldersService,
  ) {}

  @Mutation(() => Workspace)
  createWorkspace(
    @Args('createWorkspaceInput') createWorkspaceInput: CreateWorkspaceInput,
    @Context() context: WorkspaceContext,
  ) {
    return this.workspacesService.create(
      createWorkspaceInput,
      context.req.user.userId,
    );
  }

  @Query(() => [Workspace], { name: 'workspaces' })
  findAll(
    @Context() context: WorkspaceContext,
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('folderId', { type: () => String, nullable: true }) folderId?: string,
  ) {
    return this.workspacesService.findAll(
      context.req.user.userId,
      search,
      folderId,
    );
  }

  @Query(() => Workspace, { name: 'workspace' })
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: WorkspaceContext,
  ) {
    return this.workspacesService.findOne(id, context.req.user.userId);
  }

  @Mutation(() => Workspace)
  updateWorkspace(
    @Args('updateWorkspaceInput') updateWorkspaceInput: UpdateWorkspaceInput,
    @Context() context: WorkspaceContext,
  ) {
    return this.workspacesService.update(
      updateWorkspaceInput.id,
      updateWorkspaceInput,
      context.req.user.userId,
    );
  }

  @Query(() => Int, { name: 'totalWorkspaces' })
  getTotalWorkspaces(@Context() context: WorkspaceContext) {
    return this.workspacesService.getTotalWorkspaces(context.req.user.userId);
  }

  @Mutation(() => Boolean)
  removeWorkspace(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: WorkspaceContext,
  ) {
    return this.workspacesService.remove(id, context.req.user.userId);
  }

  @ResolveField(() => Task, { nullable: true })
  async task(@Parent() workspace: Workspace) {
    if (!workspace.taskId) {
      return null;
    }
    try {
      return await this.tasksService.findOne(workspace.taskId);
    } catch {
      return null;
    }
  }

  @ResolveField(() => Folder, { nullable: true })
  async folder(@Parent() workspace: Workspace) {
    if (!workspace.folderId) {
      return null;
    }
    try {
      return await this.foldersService.findOne(
        workspace.folderId,
        workspace.userId,
      );
    } catch {
      return null;
    }
  }
}
