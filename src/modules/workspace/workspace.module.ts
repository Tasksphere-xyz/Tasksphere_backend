import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMembership } from 'src/entities/project-membership.entity';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { Workspace } from 'src/entities/workspace.entity';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectMembership,
      Workspace,
      WorkspaceMembership,
    ]),
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
