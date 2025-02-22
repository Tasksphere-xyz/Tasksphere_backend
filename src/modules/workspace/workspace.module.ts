/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMembership } from 'src/entities/project-membership.entity';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { Workspace } from 'src/entities/workspace.entity';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { User } from 'src/entities/user.entity';
import { EmailService } from 'src/common/email/email.service';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectMembership,
      Workspace,
      WorkspaceMembership,
      User,
    ]),
    NotificationModule,
    forwardRef(() => UserModule),
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, EmailService],
  exports: [TypeOrmModule],
})
export class WorkspaceModule {}
