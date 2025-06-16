/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatMessage } from 'src/entities/chat-message.entity';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { WorkspaceMessage } from 'src/entities/workspace-message.entity';
import { User } from 'src/entities/user.entity';
import { Workspace } from 'src/entities/workspace.entity';
import { ChatWorkspaceGateway } from './chat-workspace.gateway';
import { NotificationModule } from '../notification/notification.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ChatCronService } from './chat-cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      WorkspaceMembership,
      WorkspaceMessage,
      User,
      Workspace,
    ]),
    NotificationModule,
    WorkspaceModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatWorkspaceGateway, ChatCronService],
  exports: [ChatService],
})
export class ChatModule {}
