/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { UserPayload } from 'express';
import { createResponse } from 'src/common/dto/response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as path from 'path';
import * as fs from 'fs';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { unlinkSavedFile } from 'src/utils/unlinkImage.util';
import { Task } from 'src/entities/task.entity';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { Activity } from 'src/entities/activity.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(WorkspaceMembership)
    private workspaceMembershipRepository: Repository<WorkspaceMembership>,
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

  public async findUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  
  async updateUserProfile(
    updateUserDto: UpdateUserDto,
    user: UserPayload,
    filePath: string,
  ) {
    const { username } = updateUserDto;
    const foundUser = await this.findUserByEmail(user.email);

    if (username) {
      foundUser.username = username;
    }

    if (filePath) {
      const imageToBeDeleted = foundUser.displayPic;

      const newFilename = `${Date.now()}_${foundUser.username}_dp${path.extname(
        filePath,
      )}`;
      const newFilePath = path.resolve(
        __dirname,
        `../../../uploads/${newFilename}`,
      );
      fs.renameSync(filePath, newFilePath);

      const response = await this.cloudinaryProvider.uploadImageToCloud(
        newFilePath,
      );

      foundUser.displayPic = response.secure_url;

      await this.userRepository.save(foundUser);

      if (imageToBeDeleted) {
        await this.cloudinaryProvider.deleteSingleImageFromCloud(
          imageToBeDeleted,
        );
      }

      unlinkSavedFile(newFilePath);
    }

    return createResponse(true, 'User profile updated successfully', {
      username: foundUser.username,
      displayPic: foundUser.displayPic,
    });
  }

  async getUserProfile(user: UserPayload) {
    // Retrieve user details
    const foundUser = await this.findUserByEmail(user.email);

    // Fetch user's tasks overview
    const [totalTasks, tasksInProgress, completedTasks, workspaceMemberships] =
      await Promise.all([
        this.taskRepository.count({ where: { user_id: foundUser.id } }),
        this.taskRepository.count({
          where: { user_id: foundUser.id, status: 'in-progress' },
        }),
        this.taskRepository.count({
          where: { user_id: foundUser.id, status: 'completed' },
        }),
        this.workspaceMembershipRepository.find({
          where: { email: foundUser.email, status: 'accepted' },
          relations: ['workspace'],
        }),
      ]);

    // Extract workspace names from memberships
    const workspaceNames = workspaceMemberships.map(
      (membership) => membership.workspace_id,
    );

    return createResponse(true, 'User profile retrieved successfully', {
      user: {
        id: foundUser.id,
        email: foundUser.email,
        username: foundUser.username,
        displayPic: foundUser.displayPic,
      },
      overview: {
        totalTasks,
        tasksInProgress,
        completedTasks,
      },
      workspaces: workspaceNames,
    });
  }

  async getUserActivities(user: UserPayload, page: number = 1) {
    page = page > 0 ? page : 1;
    const limit = 8;

    const skip = (page - 1) * limit;

    const foundUser = await this.findUserByEmail(user.email);

    const [activities, total] = await this.activityRepository.findAndCount({
      where: { user_id: foundUser.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const totalPages = Math.ceil(total / limit);

    const message =
      activities.length === 0
        ? 'No activity found'
        : 'Activities retrieved successfully';

    return createResponse(true, message, {
      activities,
      totalPages: totalPages === 0 ? 1 : totalPages,
      currentPage: page,
    });
  }
}
