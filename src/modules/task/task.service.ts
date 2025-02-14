/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly cloudinaryProvider: CloudinaryProvider,
  ) {}

  public async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
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

  async getTaskById(taskId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });
  
    if (!task) {
      throw new BadRequestException('Task not found');
    }
  
    return createResponse(true, 'Task retrieved successfully', { task });
  }
  
  async updateTask(
    taskId: number,
    updateData: Partial<CreateTaskDto>,
  ) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId},
    });
  
    if (!task) {
      throw new BadRequestException('Task not found');
    }
  
    Object.assign(task, updateData);
    await this.taskRepository.save(task);
  
    return createResponse(true, 'Task updated successfully', { task });
  }
  
  async deleteTask(taskId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });
  
    if (!task) {
      throw new BadRequestException('Task not found');
    }
  
    await this.taskRepository.delete(taskId);
    return createResponse(true, 'Task deleted successfully', {});
  }
  
  async duplicateTask(user: UserPayload, taskId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId},
    });

    if (!task) {
      throw new UnauthorizedException('Task not found');
    }
  
    const foundUser = await this.findUserByEmail(user.email);

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
  

}
