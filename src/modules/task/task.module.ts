/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/entities/task.entity';
import { User } from 'src/entities/user.entity';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { Activity } from 'src/entities/activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User, Activity])],
  controllers: [TaskController],
  providers: [TaskService, CloudinaryProvider],
  exports: [TypeOrmModule],
})
export class TaskModule {}
