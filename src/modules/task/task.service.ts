import { Injectable, NotFoundException } from '@nestjs/common';
import { UserPayload } from 'express';
import { CreateTaskDto } from './dto/create-task.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from 'src/entities/task.entity';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import * as path from 'path';
import * as fs from 'fs';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { unlinkSavedFile } from 'src/utils/unlinkImage.util';
import { UploadApiResponse } from 'cloudinary';
import { createResponse } from 'src/common/dto/response.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { Activity } from 'src/entities/activity.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    private readonly cloudinaryProvider: CloudinaryProvider,
  ) {}

  public async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  public async findTaskById(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task not found`);
    }

    return task;
  }

  public async createActivity(
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

  async createTask(
    user: UserPayload,
    createTaskDto: CreateTaskDto,
    filePath: string,
  ) {
    const { title, priority, assigned_to, start_date, due_date } =
      createTaskDto;
    const foundUser = await this.findUserByEmail(user.email);
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
      assigned_to,
      attachment: attachmentUrl,
      start_date,
      due_date,
    });

    await this.taskRepository.save(newTask);

    return createResponse(true, 'Task created successfully', {
      newTask,
    });
  }

  async updateTaskStatus(id: number, updateTaskStatusDto: UpdateTaskStatusDto) {
    const task = await this.findTaskById(id);

    task.status = updateTaskStatusDto.status;
    await this.taskRepository.save(task);

    await this.createActivity(
      task.assigned_to,
      task.id,
      'status-change',
      `Task status changed to to '${task.status}'`,
    );

    return createResponse(true, 'Task status updated successfully', {
      task,
    });
  }

  async getAllTasks(
    page: number = 1,
    assignedTo?: string,
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

    const totalPages = Math.ceil(total / limit);

    const message =
      tasks.length === 0 ? 'No task found' : 'Tasks retrieved successfully';

    return createResponse(true, message, {
      tasks,
      totalPages: totalPages === 0 ? 1 : totalPages,
      currentPage: page,
    });
  }
}
