/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatMessage } from 'src/entities/chat-message.entity';
import { ProjectMembership } from 'src/entities/project-membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, ProjectMembership]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
