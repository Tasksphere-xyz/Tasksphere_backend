/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/entities/task.entity';
import { User } from 'src/entities/user.entity';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { Activity } from 'src/entities/activity.entity';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, User, Activity]),
    forwardRef(() => UserModule),
    NotificationModule,
  ],
  controllers: [TaskController],
  providers: [TaskService, CloudinaryProvider],
  exports: [TaskService, TypeOrmModule],
})
export class TaskModule {}
