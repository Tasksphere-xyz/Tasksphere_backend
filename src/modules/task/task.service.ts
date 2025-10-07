/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { UserPayload } from 'express';
import { CreateTaskDto } from './dto/create-task.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from 'src/entities/task.entity';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { unlinkSavedFile } from 'src/utils/unlinkImage.util';
import { UploadApiResponse } from 'cloudinary';
import { createResponse } from 'src/common/dto/response.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { Activity } from 'src/entities/activity.entity';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/entities/notification.entity';
import { ChatService } from '../chat/chat.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { Workspace } from 'src/entities/workspace.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    private readonly cloudinaryProvider: CloudinaryProvider,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly chatService: ChatService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  public async findTaskById(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
        where: { id },
        relations: ['workspace'],
    });

    if (!task) {
      throw new NotFoundException(`Task not found`);
    }

    return task;
  }

  private async createActivity(
    user_id: number,
    task_id: number,
    action: 'status-change' | 'assignment',
    activity: string,
  ): Promise<void> {
    const newActivity = this.activityRepository.create({
      user_id,
      task_id,
      action,
      activity,
    });
    await this.activityRepository.save(newActivity);
  }

  private formatDate(date: Date) {
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return formattedDate;
  }

  public async createTask(
    contractId: string,
    user: UserPayload,
    createTaskDto: CreateTaskDto,
    filePath: string,
  ) {
    const {
      title,
      priority,
      description,
      assigned_to,
      start_date,
      due_date,
      workspace_id,
      taskContractId,
    } = createTaskDto;

    const foundUser = await this.userService.findUserByEmail(user.email);
    await this.workspaceService.checkUserInWorkspace(workspace_id, user.email);

    // Validate all assigned users if provided
    let assignedUserEmails: string[] = [];
    if (assigned_to && assigned_to.length > 0) {
      const assignedUsersPromises = assigned_to.map(userId => 
        this.userService.findUserById(userId)
      );
      const assignedUsers = await Promise.all(assignedUsersPromises);

      // Check if all users exist
      const invalidUserIndex = assignedUsers.findIndex(user => !user);
      if (invalidUserIndex !== -1) {
        throw new NotFoundException(`Assigned user with ID ${assigned_to[invalidUserIndex]} not found.`);
      }

      // Verify all assigned users are in the workspace
      const membershipChecks = assignedUsers.map(assignedUser =>
        this.workspaceService.checkUserInWorkspace(workspace_id, assignedUser.email)
      );
      await Promise.all(membershipChecks);

      assignedUserEmails = assignedUsers.map(u => u.email);
    }

    let attachmentUrl: string = '';

    if (filePath) {
      const newFilename = `${Date.now()}_${foundUser.username}_attachment${path.extname(filePath)}`;
      const newFilePath = path.resolve(__dirname, `../../../uploads/${newFilename}`);
      fs.renameSync(filePath, newFilePath);

      try {
        const extensionName = path.extname(newFilePath);
        let response: UploadApiResponse;

        if (extensionName === '.pdf') {
          response = await this.cloudinaryProvider.uploadPdfToCloud(newFilePath);
        } else {
          response = await this.cloudinaryProvider.uploadImageToCloud(newFilePath);
        }
        attachmentUrl = response.secure_url;
        unlinkSavedFile(newFilePath);
      } catch (error) {
        unlinkSavedFile(newFilePath);
        throw new BadRequestException('Failed to upload attachment');
      }
    }

    const newTask = this.taskRepository.create({
      user_id: foundUser.id,
      workspace_id,
      contractId,
      taskContractId,
      title,
      status: 'pending',
      priority,
      description,
      assigned_to: assigned_to && assigned_to.length > 0 ? assigned_to : undefined,
      attachment: attachmentUrl,
      start_date,
      due_date,
    });

    await this.taskRepository.save(newTask);

    // Send notifications to all assigned users
    if (assigned_to && assigned_to.length > 0 && assignedUserEmails.length > 0) {
      await this.notificationService.sendNotification(
        assignedUserEmails,
        NotificationType.ASSIGNED_TASK,
        'New Task Assigned',
        `Complete '${title}' ${due_date ? `by ${this.formatDate(due_date)}` : ''}`,
      );
    }

    if (description) {
      await this.chatService.sendNotificationToMentionedUsers(
        'task',
        description,
        foundUser.username,
      );
    }

    return createResponse(true, 'Task created successfully', {
      newTask,
    });
  }

  public async getTaskById(taskId: number, userEmail: string) {
    const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['workspace'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.workspaceService.checkUserInWorkspace(task.workspace_id, userEmail);

    const creator = await this.userService.findUserById(task.user_id);
    let assignees = [];

    // Fetch all assigned users
    if (task.assigned_to && task.assigned_to.length > 0) {
      const assigneePromises = task.assigned_to.map(userId =>
        this.userService.findUserById(userId)
      );
      assignees = await Promise.all(assigneePromises);
      // Filter out any null values in case a user was deleted
      assignees = assignees.filter(assignee => assignee !== null);
    }

    return createResponse(true, 'Task retrieved successfully', {
      ...task,
      creator,
      assignees, // Changed from assignee to assignees (array)
    });
  }

  public async updateTask(
    taskId: number,
    updateData: Partial<CreateTaskDto>,
    userEmail: string,
    filePath?: string,
  ) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['workspace'],
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    await this.workspaceService.checkUserInWorkspace(task.workspace_id, userEmail);

    // Handle file upload if provided
    if (filePath) {
      const foundUser = await this.userService.findUserByEmail(userEmail);
      
      const newFilename = `${Date.now()}_${foundUser.username}_attachment${path.extname(filePath)}`;
      const newFilePath = path.resolve(__dirname, `../../../uploads/${newFilename}`);
      fs.renameSync(filePath, newFilePath);

      try {
        const extensionName = path.extname(newFilePath);
        let response: UploadApiResponse;

        if (extensionName === '.pdf') {
          response = await this.cloudinaryProvider.uploadPdfToCloud(newFilePath);
        } else {
          response = await this.cloudinaryProvider.uploadImageToCloud(newFilePath);
        }

        if (task.attachment) {
          await this.cloudinaryProvider.deleteSingleImageFromCloud(task.attachment);
        }

        updateData.attachment = response.secure_url;
        unlinkSavedFile(newFilePath);
      } catch (error) {
        unlinkSavedFile(newFilePath);
        throw new BadRequestException('Failed to upload attachment');
      }
    }

    // Handle assigned_to updates with multiple users
    if (updateData.assigned_to !== undefined) {
      const oldAssignees = task.assigned_to || [];
      const newAssignees = updateData.assigned_to || [];

      // Check if there are actual changes
      const hasChanges = 
        oldAssignees.length !== newAssignees.length ||
        !oldAssignees.every(id => newAssignees.includes(id));

      if (hasChanges) {
        // Validate all new assignees exist and are workspace members
        if (newAssignees.length > 0) {
          const assigneePromises = newAssignees.map(userId =>
            this.userService.findUserById(userId)
          );
          const assignees = await Promise.all(assigneePromises);

          const invalidUserIndex = assignees.findIndex(user => !user);
          if (invalidUserIndex !== -1) {
            throw new NotFoundException(`User with ID ${newAssignees[invalidUserIndex]} not found.`);
          }

          const membershipChecks = assignees.map(assignee =>
            this.workspaceService.checkUserInWorkspace(task.workspace_id, assignee.email)
          );
          await Promise.all(membershipChecks);
        }

        // Calculate added and removed assignees
        const addedAssignees = newAssignees.filter(id => !oldAssignees.includes(id));
        const removedAssignees = oldAssignees.filter(id => !newAssignees.includes(id));

        // Create activity log
        let activityMessage = 'Task assignment updated';
        const changes: string[] = [];

        if (addedAssignees.length > 0) {
          const addedUsers = await Promise.all(
            addedAssignees.map(id => this.userService.findUserById(id))
          );
          const addedNames = addedUsers.map(u => u.username).join(', ');
          changes.push(`Added: ${addedNames}`);
        }

        if (removedAssignees.length > 0) {
          const removedUsers = await Promise.all(
            removedAssignees.map(id => this.userService.findUserById(id))
          );
          const removedNames = removedUsers.map(u => u.username).join(', ');
          changes.push(`Removed: ${removedNames}`);
        }

        if (changes.length > 0) {
          activityMessage = `Task assignment updated: ${changes.join('; ')}`;
        }

        await this.createActivity(
          task.user_id,
          task.id,
          'assignment',
          activityMessage,
        );

        // Send notifications to newly added assignees
        if (addedAssignees.length > 0) {
          const addedUsers = await Promise.all(
            addedAssignees.map(id => this.userService.findUserById(id))
          );
          const emails = addedUsers.map(u => u.email);
          
          await this.notificationService.sendNotification(
            emails,
            NotificationType.ASSIGNED_TASK,
            'Task Assigned to You',
            `You've been assigned to task '${task.title}'`,
          );
        }
      }
    }

    Object.assign(task, updateData);
    await this.taskRepository.save(task);

    return createResponse(true, 'Task updated successfully', { task });
  }

  public async deleteTask(taskId: number, userEmail: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['workspace'],
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    await this.workspaceService.checkUserInWorkspace(task.workspace_id, userEmail);

    if (task.user_id !== (await this.userService.findUserByEmail(userEmail)).id) {
        throw new ForbiddenException('You are not authorized to delete this task.');
    }

    await this.taskRepository.delete(taskId);
    return createResponse(true, 'Task deleted successfully', {});
  }

  public async duplicateTask(user: UserPayload, taskId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['workspace'],
    });

    if (!task) {
      throw new UnauthorizedException('Task not found');
    }

    await this.workspaceService.checkUserInWorkspace(task.workspace_id, user.email);

    const foundUser = await this.userService.findUserByEmail(user.email);

    const newTask = this.taskRepository.create({
      ...task,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      user_id: foundUser.id,
      workspace_id: task.workspace_id,
      status: 'pending',
      title: `${task.title} (Copy)`,
      assigned_to: task.assigned_to, // Copy the entire assignee array
    });

    await this.taskRepository.save(newTask);
    return createResponse(true, 'Task duplicated successfully', { newTask });
  }

  public async updateTaskStatus(
    id: number,
    updateTaskStatusDto: UpdateTaskStatusDto,
    userEmail: string,
  ) {
    const task = await this.findTaskById(id); 

    await this.workspaceService.checkUserInWorkspace(task.workspace_id, userEmail);

    const oldStatus = task.status;
    task.status = updateTaskStatusDto.status;
    await this.taskRepository.save(task);

    const userWhoUpdated = await this.userService.findUserByEmail(userEmail);
    if (!userWhoUpdated) throw new NotFoundException('User who updated task not found');

    await this.createActivity(
      userWhoUpdated.id,
      task.id,
      'status-change',
      `Task status changed from '${oldStatus}' to '${task.status}' by ${userWhoUpdated.username}`,
    );

    return createResponse(true, 'Task status updated successfully', {
      task,
    });
  }

  public async getAllTasks(
    userEmail: string,
    page: number = 1,
    workspaceId?: number,
    assignedTo?: number,
    sortBy?: 'newest' | 'oldest' | 'due-date' | 'last-updated',
    status?: 'pending' | 'in-progress' | 'completed',
    priority?: 'low' | 'medium' | 'high' | 'urgent',
  ) {
    page = page > 0 ? page : 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = this.taskRepository.createQueryBuilder('task');

    if (workspaceId) {
        await this.workspaceService.checkUserInWorkspace(workspaceId, userEmail);
        query.andWhere('task.workspace_id = :workspaceId', { workspaceId });
    } else {
      const userWorkspaces = await this.workspaceService.getAllUserWorkspaces(
        { email: userEmail, username: '', id: 0 } as UserPayload
      );
      
      if (!userWorkspaces.data || !userWorkspaces.data.workspaces || userWorkspaces.data.workspaces.length === 0) {
          return createResponse(true, 'No tasks found across your workspaces', { 
            tasks: [], 
            totalPages: 1, 
            currentPage: page 
          });
      }

      const accessibleWorkspaceIds = userWorkspaces.data.workspaces.map((ws: any) => ws.id);
      
      if (accessibleWorkspaceIds.length === 0) {
          return createResponse(true, 'No tasks found as user is not part of any workspace.', { 
            tasks: [], 
            totalPages: 1, 
            currentPage: page 
          });
      }
      
      query.andWhere('task.workspace_id IN (:...accessibleWorkspaceIds)', { accessibleWorkspaceIds });
    }

    // Filter by assignedTo - now checks if the user ID is in the array
    if (assignedTo) {
      // For PostgreSQL with simple-array (comma-separated string)
      query.andWhere("task.assigned_to LIKE :assignedTo", { 
        assignedTo: `%${assignedTo}%` 
      });
    }

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    switch (sortBy) {
      case 'newest':
        query.orderBy('task.createdAt', 'DESC');
        break;
      case 'oldest':
        query.orderBy('task.createdAt', 'ASC');
        break;
      case 'due-date':
        query.orderBy('task.due_date', 'ASC');
        break;
      case 'last-updated':
        query.orderBy('task.updatedAt', 'DESC');
        break;
      default:
        query.orderBy('task.createdAt', 'DESC');
        break;
    }

    query.skip(skip).take(limit);

    const [tasks, total] = await query.getManyAndCount();

    const enhancedTasks = await Promise.all(
      tasks.map(async (task) => {
        let assignees = [];
        if (task.assigned_to && task.assigned_to.length > 0) {
          const assigneePromises = task.assigned_to.map(userId =>
            this.userService.findUserById(userId)
          );
          assignees = await Promise.all(assigneePromises);
          assignees = assignees.filter(assignee => assignee !== null);
        }

        return {
          ...task,
          creator: await this.userService.findUserById(task.user_id),
          assignees, // Changed from assignee to assignees (array)
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    const message =
      tasks.length === 0 ? 'No task found' : 'Tasks retrieved successfully';

    return createResponse(true, message, {
      tasks: enhancedTasks,
      totalPages: totalPages === 0 ? 1 : totalPages,
      currentPage: page,
    });
  }

  public async getAllTaskHistory(
    userEmail: string,
    page: number = 1,
    workspaceId?: number,
    assignedTo?: number,
    action?: 'status-change' | 'assignment',
    from?: string,
    to?: string,
  ) {
    page = Number(page) > 0 ? Number(page) : 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = this.activityRepository.createQueryBuilder('task_activity');

    query.innerJoin(Task, 'task', 'task_activity.task_id = task.id');

    if (workspaceId) {
        await this.workspaceService.checkUserInWorkspace(workspaceId, userEmail);
        query.andWhere('task.workspace_id = :workspaceId', { workspaceId });
    } else {
      const userWorkspaces = await this.workspaceService.getAllUserWorkspaces(
          { email: userEmail, username: '', id: 0 } as UserPayload
      );
      
      if (!userWorkspaces.data || !userWorkspaces.data.workspaces || userWorkspaces.data.workspaces.length === 0) {
          return createResponse(true, 'No task history found across your workspaces', { 
            history: [], 
            totalPages: 1, 
            currentPage: page 
          });
      }
      
      const accessibleWorkspaceIds = userWorkspaces.data.workspaces.map((ws: any) => ws.id);
      
      if (accessibleWorkspaceIds.length === 0) {
          return createResponse(true, 'No task history found as user is not part of any workspace.', { 
            history: [], 
            totalPages: 1, 
            currentPage: page 
          });
      }
      
      query.andWhere('task.workspace_id IN (:...accessibleWorkspaceIds)', { accessibleWorkspaceIds });
    }

    if (assignedTo !== undefined && assignedTo !== null) {
      query.andWhere('task_activity.user_id = :assignedTo', { assignedTo });
    }

    if (action) {
      query.andWhere('task_activity.action = :action', { action });
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        query.andWhere('task_activity.createdAt BETWEEN :from AND :to', {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        });
      }
    }

    query.orderBy('task_activity.createdAt', 'DESC');

    query.skip(skip).take(limit);

    const [activities, total] = await query.getManyAndCount();

    const enhancedActivity = await Promise.all(
      activities.map(async (activity) => ({
        ...activity,
        creator: await this.userService.findUserById(activity.user_id),
      })),
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return createResponse(
      true,
      activities.length === 0
        ? 'No History found'
        : 'History retrieved successfully',
      {
        history: enhancedActivity,
        totalPages,
        currentPage: page,
      },
    );
  }
}