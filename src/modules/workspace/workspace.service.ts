/* eslint-disable prettier/prettier */
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
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/entities/notification.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(ProjectMembership)
    private projectMembershipRepository: Repository<ProjectMembership>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private workspaceMembershipRepository: Repository<WorkspaceMembership>,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  public async getAllEmailOfMembersOfWorkspace(workspaceId: number) {
    const members = await this.workspaceMembershipRepository.find({
      where: { workspace_id: workspaceId, status: 'accepted' },
    });

    if (members.length === 0) {
      return [];
    } else {
      const emails = members.map((member) => member.email);
      return emails;
    }
  }

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

  async getAllUserWorkspaces(user: UserPayload) {
    const workspaces = await this.workspaceMembershipRepository.find({
      where: { email: user.email, status: 'accepted' },
      relations: ['workspace'],
    });

    if (!workspaces.length) {
      throw new NotFoundException('No workspaces found');
    }

    const userWorkspaces = workspaces.map((membership) => membership.workspace);

    return createResponse(true, 'Workspaces retrieved successfully', {
      workspaces: userWorkspaces,
    });
  }

  async joinWorkspace(workspace_id: number, user: UserPayload) {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspace_id },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const invitation = await this.workspaceMembershipRepository.findOne({
      where: { workspace_id, email: user.email, status: 'pending' },
    });

    if (!invitation) {
      throw new ForbiddenException('You are not invited to this workspace');
    }

    // Update the invitation status to accepted
    invitation.status = 'accepted';
    await this.workspaceMembershipRepository.save(invitation);

    // send notigfication to user
    const invitedUser = await this.userService.findUserByEmail(user.email);
    const arrayOfEmail = await this.getAllEmailOfMembersOfWorkspace(
      workspace_id,
    );
    if (arrayOfEmail.length > 0) {
      await this.notificationService.sendNotification(
        arrayOfEmail,
        NotificationType.NEW_MEMBER,
        'New Member Joined',
        `${invitedUser.username} has joined the workspace: '${workspace.workspace_name}'`,
      );
    }

    return createResponse(true, 'Successfully joined the workspace', {
      workspace,
    });
  }
}
