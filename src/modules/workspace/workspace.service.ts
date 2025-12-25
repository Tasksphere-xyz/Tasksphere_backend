/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from 'src/entities/workspace.entity';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { Task } from 'src/entities/task.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UserPayload } from 'express';
import { EmailService } from 'src/common/email/email.service';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';
import { createResponse } from 'src/common/dto/response.dto';
import { NotificationType } from 'src/entities/notification.entity';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private workspaceMembershipRepository: Repository<WorkspaceMembership>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  /** 🔹 Centralized Error Handler */
  private handleError(error: any, methodName: string): never {
    const message = error?.message || 'Unknown error';
    this.logger.error(`[${methodName}] ${message}`, error?.stack || '');
    this.logger.log(error)
  
    throw error;
  }

  private async checkWorkspaceMembership(workspace_id: number, email: string) {
    try {
      const membership = await this.workspaceMembershipRepository.findOne({
        where: { workspace_id, email, status: 'accepted' },
      });
      return membership;
    } catch (error) {
      this.handleError(error, 'checkWorkspaceMembership');
    }
  }

  public async checkUserInWorkspace(workspace_id: number, email: string) {
    try {
      const membership = await this.workspaceMembershipRepository.findOne({
        where: { workspace_id, email, status: 'accepted' },
      });
      if (!membership) {
        throw new ForbiddenException('User is not a member of this workspace.');
      }
      return membership;
    } catch (error) {
      this.handleError(error, 'checkUserInWorkspace');
    }
  }

  async createWorkspace(
    contractId: string,
    createWorkspaceDto: CreateWorkspaceDto,
    user: UserPayload,
  ) {
    try {
      const { workspace_name, emails } = createWorkspaceDto;

      const newWorkspace = await this.workspaceRepository.save({
        workspace_name,
        contractId,
      });

      if (!newWorkspace) throw new BadRequestException('Failed to create workspace');

      await this.workspaceMembershipRepository.save({
        workspace_id: newWorkspace.id,
        email: user.email,
        status: 'accepted',
        role: 'owner',
      });

      const invitedMembers: string[] = [];
      const alreadyMembersOrInvited: string[] = [];

      for (const email of emails) {
        if (email === user.email) {
          alreadyMembersOrInvited.push(email);
          continue;
        }

        const existingMembership = await this.workspaceMembershipRepository.findOne({
          where: { workspace_id: newWorkspace.id, email },
        });

        if (existingMembership) {
          alreadyMembersOrInvited.push(email);
          continue;
        }

        await this.workspaceMembershipRepository.save({
          workspace_id: newWorkspace.id,
          email,
          status: 'pending',
          role: 'member',
        });

        await this.emailService.sendEmail(
          email,
          'Invitation to join Workspace',
          `${user.email} has invited you to join '${newWorkspace.workspace_name}'. Click <a href="#">here</a> to accept the invitation.`,
        );

        invitedMembers.push(email);
      }

      const message = `Workspace created successfully. ${invitedMembers.length} ${
        invitedMembers.length === 1 ? 'user' : 'users'
      } invited.`;

      return createResponse(true, message, {
        newWorkspace,
        invitedMembers,
        alreadyMembersOrInvited,
      });
    } catch (error) {
      this.handleError(error, 'createWorkspace');
    }
  }

  async inviteUserToWorkspace(
    workspace_id: number,
    inviteUserDto: InviteUserDto,
    user: UserPayload,
  ) {
    try {
      const workspace = await this.workspaceRepository.findOne({ where: { id: workspace_id } });
      if (!workspace) throw new NotFoundException('Workspace not found');

      const inviter = await this.checkUserInWorkspace(workspace_id, user.email);
      if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
        throw new ForbiddenException('Not authorized to invite users');
      }

      const { emails } = inviteUserDto;
      const existingMembers: string[] = [];
      const invitedMembers: string[] = [];

      for (const email of emails) {
        const existingMembership = await this.checkWorkspaceMembership(workspace_id, email);
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
    } catch (error) {
      this.handleError(error, 'inviteUserToWorkspace');
    }
  }

  async getWorkspaceMembers(workspace_id: number, user: UserPayload, page = 1) {
    try {
      page = page > 0 ? page : 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const workspace = await this.workspaceRepository.findOne({ where: { id: workspace_id } });
      if (!workspace) throw new NotFoundException('Workspace not found');

      const userMembership = await this.checkWorkspaceMembership(workspace_id, user.email);
      if (!userMembership) throw new ForbiddenException('Not a member of the workspace');

      const { raw } = await this.workspaceMembershipRepository
        .createQueryBuilder('membership')
        .leftJoin('user', 'user', 'user.email = membership.email')
        .select([
          'membership.id AS membership_id',
          'membership.email AS membership_email',
          'membership.role AS membership_role',
          'membership.status AS membership_status',
          'membership.createdAt AS membership_createdAt',
          'user.id AS user_id',
          'user.username AS user_username',
          'user.wallet_address AS user_wallet_address',
          'user.displayPic AS user_displayPic',
        ])
        .where('membership.workspace_id = :workspaceId', { workspaceId: workspace_id })
        .andWhere('membership.status = :status', { status: 'accepted' })
        .orderBy('membership.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getRawAndEntities();

      const total = await this.workspaceMembershipRepository.count({ where: { workspace_id } });

      const formattedMembers = raw.map((row) => ({
        id: row.user_id,
        email: row.membership_email,
        role: row.membership_role,
        username: row.user_username,
        wallet_address: row.user_wallet_address,
        displayPic: row.user_displayPic,
        isOwner: row.membership_role === 'owner',
      }));

      const totalPages = Math.ceil(total / limit);
      const message =
        formattedMembers.length === 0
          ? 'No team members found'
          : 'Team members retrieved successfully';

      return createResponse(true, message, {
        members: formattedMembers,
        totalPages: totalPages === 0 ? 1 : totalPages,
        currentPage: page,
      });
    } catch (error) {
      this.handleError(error, 'getWorkspaceMembers');
    }
  }

  async getWorkspaceDetails(contractId: string) {
    try {
      const workspace = await this.workspaceRepository.findOne({ where: { contractId } });
      if (!workspace) throw new NotFoundException('Workspace not found');

      const [totalTasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
        this.taskRepository.count({ where: { workspace_id: workspace.id } }),
        this.taskRepository.count({ where: { workspace_id: workspace.id, status: 'completed' } }),
        this.taskRepository.count({ where: { workspace_id: workspace.id, status: 'in-progress' } }),
        this.taskRepository
          .createQueryBuilder('task')
          .where('task.workspace_id = :workspaceId', { workspaceId: workspace.id })
          .andWhere('task.status != :completed', { completed: 'completed' })
          .andWhere('task.due_date < NOW()')
          .getCount(),
      ]);

      const overview = {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
      };

      return createResponse(true, 'Workspace fetched successfully', {
        workspace,
        overview,
      });
    } catch (error) {
      this.handleError(error, 'getWorkspaceDetails');
    }
  }

  async joinWorkspace(workspace_id: number, user: UserPayload) {
    try {
      const workspace = await this.workspaceRepository.findOne({ where: { id: workspace_id } });
      if (!workspace) throw new NotFoundException('Workspace not found');

      const invitation = await this.workspaceMembershipRepository.findOne({
        where: { workspace_id, email: user.email, status: 'pending' },
      });

      if (!invitation) {
        throw new ForbiddenException(
          'You are not invited to this workspace or your invitation has expired/been declined.',
        );
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

      return createResponse(true, 'Successfully joined the workspace', { workspace });
    } catch (error) {
      this.handleError(error, 'joinWorkspace');
    }
  }

  public async getAllEmailOfMembersOfWorkspace(workspaceId: number) {
    try {
      const members = await this.workspaceMembershipRepository.find({
        where: { workspace_id: workspaceId, status: 'accepted' },
      });
      return members.length ? members.map((m) => m.email) : [];
    } catch (error) {
      this.handleError(error, 'getAllEmailOfMembersOfWorkspace');
    }
  }

  async getAllUserWorkspaces(user: UserPayload) {
    try {
      const workspaces = await this.workspaceMembershipRepository.find({
        where: { email: user.email, status: 'accepted' },
        relations: ['workspace'],
      });

      if (!workspaces.length) throw new NotFoundException('No workspaces found');

      const userWorkspaces = workspaces.map((membership) => ({
        id: membership.workspace_id,
        name: membership.workspace.workspace_name,
        contractId: membership.workspace.contractId,
      }));

      return createResponse(true, 'Workspaces retrieved successfully', {
        workspaces: userWorkspaces,
      });
    } catch (error) {
      this.handleError(error, 'getAllUserWorkspaces');
    }
  }

  async deleteWorkspace(workspace_id: number, user: UserPayload) {
    try {
      const workspace = await this.workspaceRepository.findOne({ where: { id: workspace_id } });
      if (!workspace) throw new NotFoundException('Workspace not found');

      const userMembership = await this.checkUserInWorkspace(workspace_id, user.email);
      if (!userMembership || userMembership.role !== 'owner') {
        throw new ForbiddenException('Only workspace owner can delete the workspace');
      }

      await this.workspaceMembershipRepository.delete({ workspace_id });
      await this.taskRepository.delete({ workspace_id });
      await this.workspaceRepository.delete({ id: workspace_id });

      return createResponse(true, 'Workspace deleted successfully', {});
    } catch (error) {
      this.handleError(error, 'deleteWorkspace');
    }
  }
}
