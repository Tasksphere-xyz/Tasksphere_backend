/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from 'src/entities/workspace.entity';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { EmailService } from 'src/common/email/email.service';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { Task } from 'src/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceMembership, Task]),
    NotificationModule,
    forwardRef(() => UserModule),
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, EmailService],
  exports: [TypeOrmModule, WorkspaceService],
})
export class WorkspaceModule {}