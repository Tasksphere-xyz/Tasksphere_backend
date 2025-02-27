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
import { ChatModule } from '../chat/chat.module';
import { TaskCronService } from './task-cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, User, Activity]),
    forwardRef(() => UserModule),
    NotificationModule,
    ChatModule,
  ],
  controllers: [TaskController],
  providers: [TaskService, CloudinaryProvider, TaskCronService],
  exports: [TaskService, TypeOrmModule],
})
export class TaskModule {}
