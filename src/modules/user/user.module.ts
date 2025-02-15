/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { TaskModule } from '../task/task.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { Activity } from 'src/entities/activity.entity';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { Task } from 'src/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Activity, WorkspaceMembership, Task]),
    forwardRef(() => TaskModule),
    WorkspaceModule,
  ],
  controllers: [UserController],
  providers: [UserService, CloudinaryProvider],
  exports: [UserService],
})
export class UserModule {}

