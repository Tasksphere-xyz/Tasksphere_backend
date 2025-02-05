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
// import { User } from 'src/entities/user.entity';
import { EmailService } from 'src/common/email/email.service';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(ProjectMembership)
    private projectMembershipRepository: Repository<ProjectMembership>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private workspaceMembershipRepository: Repository<WorkspaceMembership>,
    // @InjectRepository(User)
    // private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async createWorkspace(
    createWorkspaceDto: CreateWorkspaceDto,
    user: UserPayload,
    project_id: number,
  ) {
    const isMemberOfProject = await this.projectMembershipRepository.findOne({
      where: { project_id, email: user.email, status: 'accepted' },
    });

    if (!isMemberOfProject) {
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

    return createResponse(true, 'Workspace created successfully', {
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
      throw new ForbiddenException('Not authorized to invite users.');
    }

    const { emails } = inviteUserDto;
    const existingMembers: string[] = [];
    const nonProjectMembers: string[] = [];
    const invitedMembers: string[] = [];

    for (const email of emails) {
      // Check if user exists
      // const foundUser = await this.userRepository.findOne({ where: { email } });
      // if (!foundUser) {
      //   nonProjectMembers.push(email);
      //   continue; // Skip to next email
      // }

      // Check if user is already a member of the workspace
      const existingMembership =
        await this.workspaceMembershipRepository.findOne({
          where: { workspace_id, email },
        });
      if (existingMembership) {
        existingMembers.push(email);
        continue;
      }

      // Check if user is part of the project
      const isMemberOfProject = await this.projectMembershipRepository.findOne({
        where: { project_id: workspace.project_id, email },
      });
      if (!isMemberOfProject) {
        nonProjectMembers.push(email);
        continue;
      }

      // Send invitation email
      await this.emailService.sendEmail(
        email,
        'Invitation to join Workspace',
        `${inviter.email} has invited you to join this workspace. Click <a href="#">here</a> to accept the invitation.`,
      );

      invitedMembers.push(email);
    }

    const message = `${invitedMembers.length} ${
      invitedMembers.length > 1 ? 'Users' : 'User'
    } invited to project successfully`;

    return createResponse(true, message, {
      existingMembers,
      nonProjectMembers,
      invitedMembers,
    });
  }
}
