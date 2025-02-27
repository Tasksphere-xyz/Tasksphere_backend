/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
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

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    private readonly cloudinaryProvider: CloudinaryProvider,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly chatService: ChatService,
  ) {}

  public async findTaskById(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });

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
    user: UserPayload,
    createTaskDto: CreateTaskDto,
    filePath: string,
  ) {
    const { title, priority, description, assigned_to, start_date, due_date } =
      createTaskDto;
    const foundUser = await this.userService.findUserByEmail(user.email);
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

    if (assigned_to) {
      const assignedUser = await this.userService.findUserById(assigned_to);

      await this.notificationService.sendNotification(
        [assignedUser.email],
        NotificationType.ASSIGNED_TASK,
        'New Task Assigned',
        `Complete '${title}' ${
          due_date ? `by ${this.formatDate(due_date)}` : ''
        }`,
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

  public async getTaskById(taskId: number) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

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

  public async updateTask(taskId: number, updateData: Partial<CreateTaskDto>) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    Object.assign(task, updateData);
    await this.taskRepository.save(task);

    return createResponse(true, 'Task updated successfully', { task });
  }

  public async deleteTask(taskId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    await this.taskRepository.delete(taskId);
    return createResponse(true, 'Task deleted successfully', {});
  }

  public async duplicateTask(user: UserPayload, taskId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new UnauthorizedException('Task not found');
    }

    const foundUser = await this.userService.findUserByEmail(user.email);

    const newTask = this.taskRepository.create({
      ...task,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      user_id: foundUser.id,
      status: 'pending',
      title: `${task.title} (Copy)`,
    });

    await this.taskRepository.save(newTask);
    return createResponse(true, 'Task duplicated successfully', { newTask });
  }

  public async updateTaskStatus(
    id: number,
    updateTaskStatusDto: UpdateTaskStatusDto,
  ) {
    const task = await this.findTaskById(id);

    task.status = updateTaskStatusDto.status;
    await this.taskRepository.save(task);

    await this.createActivity(
      task.assigned_to,
      task.id,
      'status-change',
      `Task status changed to '${task.status}'`,
    );

    return createResponse(true, 'Task status updated successfully', {
      task,
    });
  }

  public async getAllTasks(
    page: number = 1,
    assignedTo?: number,
    sortBy?: 'newest' | 'oldest' | 'due-date' | 'last-updated',
    status?: 'pending' | 'in-progress' | 'completed',
    priority?: 'low' | 'medium' | 'high' | 'urgent',
  ) {
    page = page > 0 ? page : 1;
    const limit = 10;

    const skip = (page - 1) * limit;

    const query = this.taskRepository.createQueryBuilder('task');

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
    page: number = 1,
    assignedTo?: number,
    action?: 'status-change' | 'assignment',
    from?: string,
    to?: string,
  ) {
    page = Number(page) > 0 ? Number(page) : 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = this.activityRepository.createQueryBuilder('task_activity');

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
