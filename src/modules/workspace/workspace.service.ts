import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UserPayload } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Workspace } from 'src/entities/workspace.entity';
import { Repository } from 'typeorm';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { ProjectMembership } from 'src/entities/project-membership.entity';
import { createResponse } from 'src/common/dto/response.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(ProjectMembership)
    private projectMembershipRepository: Repository<ProjectMembership>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private workspaceMembershipRepository: Repository<WorkspaceMembership>,
  ) {}

  async createWorkspace(
    createWorkspaceDto: CreateWorkspaceDto,
    user: UserPayload,
    project_id: number,
  ) {
    const isMember = await this.projectMembershipRepository.findOne({
      where: { project_id, email: user.email, status: 'accepted' },
    });

    if (!isMember) {
      throw new BadRequestException("Can't create a workspace");
    }

    const newWorkspace = await this.workspaceRepository.save({
      project_id,
      workspace_name: createWorkspaceDto.workspace_name,
    });

    if (!newWorkspace) {
      throw new BadRequestException('Failed to create workspace');
    }

    await this.workspaceMembershipRepository.save({
      workspace_id: newWorkspace.id,
      email: user.email,
      role: 'admin',
      status: 'accepted',
    });

    return createResponse(true, 'Project created successfully', {
      newWorkspace,
    });
  }
}
