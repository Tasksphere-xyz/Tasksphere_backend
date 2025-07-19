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
    } = createTaskDto;

    const foundUser = await this.userService.findUserByEmail(user.email);

    // Validate if the creator is a member of the specified workspace
    await this.workspaceService.checkUserInWorkspace(workspace_id, user.email);

    let assignedUserEmail: string | null = null;
    if (assigned_to) {
        const assignedUser = await this.userService.findUserById(assigned_to);
        if (!assignedUser) {
            throw new NotFoundException('Assigned user not found.');
        }
        // Validate if the assigned user is also a member of the workspace
        await this.workspaceService.checkUserInWorkspace(workspace_id, assignedUser.email);
        assignedUserEmail = assignedUser.email;
    }

    let attachmentUrl: string = '';

    if (filePath) {
      const newFilename = `${Date.now()}_${
        foundUser.username
      }_attachment${path.extname(filePath)}`;
      const newFilePath = path.resolve(
        __dirname,
        `../../../uploads/${newFilename}`,
      );
      fs.renameSync(filePath, newFilePath);

      const extensionName = path.extname(newFilePath);
      let response: UploadApiResponse;

      if (extensionName === '.pdf') {
        response = await this.cloudinaryProvider.uploadPdfToCloud(newFilePath);
      } else {
        response = await this.cloudinaryProvider.uploadImageToCloud(
          newFilePath,
        );
      }
      attachmentUrl = response.secure_url;

      unlinkSavedFile(newFilePath);
    }

    const newTask = this.taskRepository.create({
      user_id: foundUser.id,
      workspace_id,
      contractId,
      title,
      status: 'pending',
      priority,
      description,
      assigned_to,
      attachment: attachmentUrl,
      start_date,
      due_date,
    });

    await this.taskRepository.save(newTask);

    // Send notification to assigned user
    if (assigned_to && assignedUserEmail) { // Use assignedUserEmail for notification
      const assignedUser = await this.userService.findUserById(assigned_to); // Re-fetch or use existing assignedUser object if passed
      await this.notificationService.sendNotification(
        [assignedUser.email],
        NotificationType.ASSIGNED_TASK,
        'New Task Assigned',
        `Complete '${title}' ${
          due_date ? `by ${this.formatDate(due_date)}` : ''
        }`,
      );
    }

    // Send notification to mentioned users in description
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

  public async getTaskById(taskId: number, userEmail: string) { // Added userEmail for authorization
    const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['workspace'], // Load workspace to check membership
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Ensure the requesting user is a member of the task's workspace
    await this.workspaceService.checkUserInWorkspace(task.workspace_id, userEmail);


    const creator = await this.userService.findUserById(task.user_id);
    let assignee = null;

    if (task.assigned_to) {
      assignee = await this.userService.findUserById(Number(task.assigned_to));
    }

    return createResponse(true, 'Task retrieved successfully', {
      ...task,
      creator,
      assignee,
    });
  }

  public async updateTask(
    taskId: number,
    updateData: Partial<CreateTaskDto>,
    userEmail: string, // Added userEmail for authorization
    ) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['workspace'], // Load workspace to check membership
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    // Ensure the requesting user is a member of the task's workspace
    await this.workspaceService.checkUserInWorkspace(task.workspace_id, userEmail);

    // If assigned_to is being updated, validate new assignee's membership
    if (updateData.assigned_to !== undefined && updateData.assigned_to !== null && updateData.assigned_to !== task.assigned_to) {
        const newAssignedUser = await this.userService.findUserById(updateData.assigned_to);
        if (!newAssignedUser) {
            throw new NotFoundException('New assigned user not found.');
        }
        await this.workspaceService.checkUserInWorkspace(task.workspace_id, newAssignedUser.email);

        // Record activity for assignment change
        await this.createActivity(
            task.user_id, // User who made the change (creator of task) - adjust if actual modifier is needed
            task.id,
            'assignment',
            `Task assigned from ${task.assigned_to ? (await this.userService.findUserById(task.assigned_to)).username : 'unassigned'} to ${newAssignedUser.username}`,
        );
    }

    Object.assign(task, updateData);
    await this.taskRepository.save(task);

    return createResponse(true, 'Task updated successfully', { task });
  }

  public async deleteTask(taskId: number, userEmail: string) { // Added userEmail for authorization
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['workspace'],
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    // Ensure the requesting user is a member of the task's workspace
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

    // Ensure the requesting user is a member of the task's workspace
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
    });

    await this.taskRepository.save(newTask);
    return createResponse(true, 'Task duplicated successfully', { newTask });
  }

  public async updateTaskStatus(
    id: number,
    updateTaskStatusDto: UpdateTaskStatusDto,
    userEmail: string, // Added userEmail for authorization
  ) {
    const task = await this.findTaskById(id); 

    // Ensure the requesting user is a member of the task's workspace
    await this.workspaceService.checkUserInWorkspace(task.workspace_id, userEmail);

    const oldStatus = task.status;
    task.status = updateTaskStatusDto.status;
    await this.taskRepository.save(task);

    // Assuming the user who updates the status is the one whose ID is used for activity
    const userWhoUpdated = await this.userService.findUserByEmail(userEmail);
    if (!userWhoUpdated) throw new NotFoundException('User who updated task not found');

    await this.createActivity(
      userWhoUpdated.id, // Use the ID of the user who performed the action
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

    // IMPORTANT: If a workspaceId is provided, validate user's membership
    if (workspaceId) {
        await this.workspaceService.checkUserInWorkspace(workspaceId, userEmail);
        query.andWhere('task.workspace_id = :workspaceId', { workspaceId });
    } else {
        // If no workspaceId is provided, get tasks from all workspaces the user is part of
        const userWorkspaces = await this.workspaceService.getAllUserWorkspaces(
            { email: userEmail, username: '', id: 0 } as UserPayload
        );
        if (!userWorkspaces.data || !userWorkspaces.data.workspaces || userWorkspaces.data.workspaces.length === 0) {
            return createResponse(true, 'No tasks found across your workspaces', { tasks: [], totalPages: 1, currentPage: page });
        }
        const accessibleWorkspaceIds = userWorkspaces.data.workspaces.map((ws: any) => ws.id);
        if (accessibleWorkspaceIds.length === 0) {
            return createResponse(true, 'No tasks found as user is not part of any workspace.', { tasks: [], totalPages: 1, currentPage: page });
        }
        query.andWhere('task.workspace_id IN (:...accessibleWorkspaceIds)', { accessibleWorkspaceIds });
    }


    if (assignedTo) {
      query.andWhere('task.assigned_to = :assignedTo', { assignedTo });
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
      default: // Default sort if none provided
        query.orderBy('task.createdAt', 'DESC');
        break;
    }

    query.skip(skip).take(limit);

    const [tasks, total] = await query.getManyAndCount();

    const enhancedTasks = await Promise.all(
      tasks.map(async (task) => ({
        ...task,
        creator: await this.userService.findUserById(task.user_id),
        assignee: task.assigned_to
          ? await this.userService.findUserById(task.assigned_to)
          : null,
      })),
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

    // Join with Task entity to filter by workspace_id
    query.innerJoin(Task, 'task', 'task_activity.task_id = task.id');

    if (workspaceId) {
        await this.workspaceService.checkUserInWorkspace(workspaceId, userEmail);
        query.andWhere('task.workspace_id = :workspaceId', { workspaceId });
    } else {
        // If no workspaceId, get history from all workspaces user is part of
        const userWorkspaces = await this.workspaceService.getAllUserWorkspaces(
            { email: userEmail, username: '', id: 0 } as UserPayload
        );
        if (!userWorkspaces.data || !userWorkspaces.data.workspaces || userWorkspaces.data.workspaces.length === 0) {
            return createResponse(true, 'No task history found across your workspaces', { history: [], totalPages: 1, currentPage: page });
        }
        const accessibleWorkspaceIds = userWorkspaces.data.workspaces.map((ws: any) => ws.id);
        if (accessibleWorkspaceIds.length === 0) {
            return createResponse(true, 'No task history found as user is not part of any workspace.', { history: [], totalPages: 1, currentPage: page });
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