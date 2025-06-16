/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
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
import { createResponse } from 'src/common/dto/response.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { EmailService } from 'src/common/email/email.service';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';
import { NotificationType } from 'src/entities/notification.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership) 
    private workspaceMembershipRepository: Repository<WorkspaceMembership>,
    private emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  private async checkWorkspaceMembership(
    workspace_id: number,
    email: string,
    status?: 'accepted' | 'pending' | 'declined',
  ) {
    const whereConditions: any = { workspace_id, email };
    if (status) {
      whereConditions.status = status;
    }

    const membership = await this.workspaceMembershipRepository.findOne({
      where: whereConditions,
    });

    return membership;
  }

  public async checkUserInWorkspace(workspace_id: number, email: string) {
    const membership = await this.workspaceMembershipRepository.findOne({
      where: { workspace_id, email, status: 'accepted' },
    });
    if (!membership) {
      throw new ForbiddenException('User is not a member of this workspace.');
    }
    return membership;
  }

  async createWorkspace(createWorkspaceDto: CreateWorkspaceDto, user: UserPayload) {
    const { workspace_name, description } = createWorkspaceDto;

    const newWorkspace = await this.workspaceRepository.save({
      workspace_name,
      description,
    });

    if (!newWorkspace) {
      throw new BadRequestException('Failed to create workspace');
    }

    await this.workspaceMembershipRepository.save({
      workspace_id: newWorkspace.id,
      email: user.email,
      status: 'accepted',
      role: 'owner',
    });

    return createResponse(true, 'Workspace created successfully', { newWorkspace });
  }

  async inviteUserToWorkspace(
    workspace_id: number,
    inviteUserDto: InviteUserDto,
    user: UserPayload,
  ) {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspace_id },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const inviter = await this.checkUserInWorkspace(
      workspace_id,
      user.email,
    );

    if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
      throw new ForbiddenException('Not authorized to invite users');
    }

    const { emails } = inviteUserDto;
    const existingMembers: string[] = [];
    const invitedMembers: string[] = [];

    for (const email of emails) {
      const existingMembership = await this.checkUserInWorkspace(
        workspace_id,
        email,
      );
      if (existingMembership) {
        existingMembers.push(email);
        continue;
      }

      await this.workspaceMembershipRepository.save({
        workspace_id,
        email,
        status: 'pending',
        role: 'member',
      });

      await this.emailService.sendEmail(
        email,
        'Invitation to join Workspace',
        `${inviter.email} has invited you to join '${workspace.workspace_name}'. Click <a href="#">here</a> to accept the invitation.`,
      );

      invitedMembers.push(email);
    }

    const message = `${invitedMembers.length} ${
      invitedMembers.length > 1 ? 'Users' : 'User'
    } invited to workspace successfully`;

    return createResponse(true, message, {
      existingMembers,
      invitedMembers,
    });
  }

  async getWorkspaceMembers(
    workspace_id: number,
    user: UserPayload,
    page: number = 1,
  ) {
    page = page > 0 ? page : 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspace_id },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const userMembership = await this.checkWorkspaceMembership(
      workspace_id,
      user.email,
    );
    if (!userMembership) {
      throw new ForbiddenException('Not a member of the workspace');
    }

    const [members, total] =
      await this.workspaceMembershipRepository.findAndCount({ 
        where: { workspace_id },
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

    const totalPages = Math.ceil(total / limit);

    const message =
      members.length === 0
        ? 'No team members found'
        : 'Team members retrieved successfully';

    return createResponse(true, message, {
      members,
      totalPages: totalPages === 0 ? 1 : totalPages,
      currentPage: page,
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
      throw new ForbiddenException('You are not invited to this workspace or your invitation has expired/been declined.');
    }

    invitation.status = 'accepted';
    await this.workspaceMembershipRepository.save(invitation);

    const invitedUser = await this.userService.findUserByEmail(user.email);
    const arrayOfEmail = await this.getAllEmailOfMembersOfWorkspace(workspace_id);
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

  async getAllUserWorkspaces(user: UserPayload) {
    const workspaces = await this.workspaceMembershipRepository.find({
      where: { email: user.email, status: 'accepted' },
      relations: ['workspace'],
    });

    if (!workspaces.length) {
      throw new NotFoundException('No workspaces found');
    }

    const userWorkspaces = workspaces.map((membership) => membership.workspace_id);

    return createResponse(true, 'Workspaces retrieved successfully', {
      workspaces: userWorkspaces,
    });
  }
}