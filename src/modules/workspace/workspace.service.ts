import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UserPayload } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Workspace } from 'src/entities/workspace.entity';
import { Repository } from 'typeorm';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { ProjectMembership } from 'src/entities/project-membership.entity';
import { createResponse } from 'src/common/dto/response.dto';
import { InviteUserDto } from '../project/dto/invite-user.dto';
import { User } from 'src/entities/user.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(ProjectMembership)
    private projectMembershipRepository: Repository<ProjectMembership>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private workspaceMembershipRepository: Repository<WorkspaceMembership>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  async inviteUserToWorkspace(
    workspace_id: number,
    inviteUserDto: InviteUserDto,
    user: UserPayload,
  ) {
    // check if workspace exists
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspace_id },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    // check the eligibility of the inviter
    const inviter = await this.workspaceMembershipRepository.findOne({
      where: { workspace_id, email: user.email, status: 'accepted' },
    });
    if (!inviter || inviter.role !== 'admin') {
      throw new ForbiddenException('Unauthorized access.');
    }

    // check if user exists at all
    const { email } = inviteUserDto;
    const foundUser = await this.userRepository.findOne({ where: { email } });
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    //check if user is already a memeber
    const existingMembership = await this.workspaceMembershipRepository.findOne(
      { where: { workspace_id, email } },
    );
    if (existingMembership) {
      throw new BadRequestException(
        'User is already a member of the  workspace.',
      );
    }

    // check if user is a part of the project
    const projectMembership = await this.projectMembershipRepository.findOne({
      where: {
        project_id: workspace.project_id,
        email,
      },
    });
    if (!projectMembership) {
      throw new ForbiddenException('User must be part of the project.');
    }

    // Add user to workspace_membership as pending
    const inviteInfo = await this.workspaceMembershipRepository.save({
      workspace_id,
      email,
      role: 'member',
      status: 'pending',
    });

    return createResponse(true, 'User invited to workspace successfully', {
      inviteInfo,
    });
  }
}
