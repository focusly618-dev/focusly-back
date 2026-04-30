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
import { FoldersService } from './folders.service';
import { Folder } from './entities/folder.entity';
import { CreateFolderInput } from './dto/create-folder.input';
import { UpdateFolderInput } from './dto/update-folder.input';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { Workspace } from '../workspaces/schemas/workspace.schema';
import { ResolveField, Parent } from '@nestjs/graphql';

interface FolderContext {
  req: {
    user: {
      userId: string;
    };
  };
}

@Resolver(() => Folder)
@UseGuards(GqlAuthGuard)
export class FoldersResolver {
  constructor(
    private readonly foldersService: FoldersService,
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService,
  ) {}

  @Mutation(() => Folder)
  createFolder(
    @Args('createFolderInput') createFolderInput: CreateFolderInput,
    @Context() context: FolderContext,
  ) {
    return this.foldersService.create(
      createFolderInput,
      context.req.user.userId,
    );
  }

  @Query(() => [Folder], { name: 'folders' })
  findAll(@Context() context: FolderContext) {
    return this.foldersService.findAll(context.req.user.userId);
  }

  @Query(() => Folder, { name: 'folder' })
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: FolderContext,
  ) {
    return this.foldersService.findOne(id, context.req.user.userId);
  }

  @Mutation(() => Folder)
  updateFolder(
    @Args('updateFolderInput') updateFolderInput: UpdateFolderInput,
    @Context() context: FolderContext,
  ) {
    return this.foldersService.update(
      updateFolderInput.id,
      updateFolderInput,
      context.req.user.userId,
    );
  }

  @Mutation(() => Boolean)
  removeFolder(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: FolderContext,
  ) {
    return this.foldersService.remove(id, context.req.user.userId);
  }

  @Query(() => Int, { name: 'totalFolders' })
  getTotalFolders(@Context() context: FolderContext) {
    return this.foldersService.getTotalFolders(context.req.user.userId);
  }

  @ResolveField(() => Int)
  async workspaceCount(
    @Parent() folder: Folder,
    @Context() context: FolderContext,
  ) {
    const workspaces = await this.workspacesService.findAll(
      context.req.user.userId,
      undefined,
      folder.id,
    );
    return workspaces.length;
  }

  @ResolveField(() => [Workspace])
  async workspaces(
    @Parent() folder: Folder,
    @Context() context: FolderContext,
  ) {
    return this.workspacesService.findAll(
      context.req.user.userId,
      undefined,
      folder.id,
    );
  }
}
