/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from 'src/entities/chat-message.entity';
import { ProjectMembership } from 'src/entities/project-membership.entity';
import { createResponse } from 'src/common/dto/response.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { WorkspaceMembership } from 'src/entities/workspace-membership.entity';
import { SendWorkspaceMessageDto } from './dto/send-workspace-message.dto';
import { WorkspaceMessage } from 'src/entities/workspace-message.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/entities/notification.entity';
import { WorkspaceService } from '../workspace/workspace.service';
import { User } from 'src/entities/user.entity';
import { Workspace } from 'src/entities/workspace.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepository: Repository<ChatMessage>,

    @InjectRepository(ProjectMembership)
    private projectMembershipRepository: Repository<ProjectMembership>,

    @InjectRepository(WorkspaceMembership)
    private workspaceMembershipRepository: Repository<WorkspaceMembership>,

    @InjectRepository(WorkspaceMessage)
    private workspaceMessageRepository: Repository<WorkspaceMessage>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,

    private readonly notificationService: NotificationService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  public async isUserInWorkspace(workspace_id: number, sender_email: string) {
    const senderMembership = await this.workspaceMembershipRepository.findOne({
      where: { workspace_id, email: sender_email, status: 'accepted' },
    });
    if (!senderMembership) {
      throw new ForbiddenException('User must be a member of workspace.');
    }

    return senderMembership;
  }

  public getFirstFiveWords(text: string): string {
    const words = text.split(/\s+/); // split by any whitespace
    const firstFive = words.slice(0, 5);
    return firstFive.join(' ');
  }

  public async sendNotificationToMentionedUsers(
    messageContext: string,
    message: string,
    sender_name: string,
  ) {
    // to extract message in this format @username(email@example.com)
    const mentionRegex = /@(\w+)\(([^)]+)\)/g;
    const mentions: { username: string; email: string }[] = [];
    let match: RegExpExecArray | null;

    // Loop through all matches in the message
    while ((match = mentionRegex.exec(message)) !== null) {
      if (match[1] && match[2]) {
        mentions.push({ username: match[1], email: match[2] });
      }
    }
    if (mentions.length === 0) {
      return;
    }
    // const mentions = this.extractMentions(message);
    const mentionedEmails = mentions.map((mention) => mention.email);
    await this.notificationService.sendNotification(
      mentionedEmails,
      NotificationType.MENTION,
      'You Were Mentioned',
      `${sender_name} tagged you in the ${messageContext}: '${this.getFirstFiveWords(
        message,
      )}'`,
    );
  }

  private async sendNotificationForNewMessage(
    workspace_id: number,
    workspace_name: string,
    sender_name: string,
  ) {
    const arrayOfEmail =
      await this.workspaceService.getAllEmailOfMembersOfWorkspace(workspace_id);
    if (arrayOfEmail.length > 0) {
      await this.notificationService.sendNotification(
        arrayOfEmail,
        NotificationType.NEW_MESSAGE,
        `New Message in ${workspace_name} workspace`,
        `${sender_name} sent a new message in #${workspace_name}: ${this.getFirstFiveWords}`,
      );
    }
  }

  async sendMessage(sender_email: string, sendMessageDto: SendMessageDto) {
    const { receiver_email, project_id, message, fileUrl } = sendMessageDto;

    // Ensure both users are in the same project
    const senderMembership = await this.projectMembershipRepository.findOne({
      where: { project_id, email: sender_email, status: 'accepted' },
    });
    const receiverMembership = await this.projectMembershipRepository.findOne({
      where: { project_id, email: receiver_email, status: 'accepted' },
    });

    if (!senderMembership || !receiverMembership) {
      throw new ForbiddenException('Both users must be in the same project.');
    }

    // Save message
    const newMessage = this.chatRepository.create({
      sender_email,
      receiver_email,
      project_id,
      message,
      fileUrl,
      is_read: false,
    });

    await this.chatRepository.save(newMessage);

    return createResponse(true, 'Message sent successfully', { newMessage });
  }

  async getMessages(
    sender_email: string,
    receiver_email: string,
    project_id: number,
  ) {
    const messages = await this.chatRepository.find({
      where: [
        { sender_email, receiver_email, project_id },
        {
          sender_email: receiver_email,
          receiver_email: sender_email,
          project_id,
        },
      ],
      order: { createdAt: 'ASC' },
    });

    if (!messages.length) {
      throw new NotFoundException('No messages found between these users.');
    }

    // Mark unread messages as read
    await this.chatRepository.update(
      {
        sender_email: receiver_email,
        receiver_email: sender_email,
        project_id,
        is_read: false,
      },
      { is_read: true },
    );

    return createResponse(true, 'Messages retrieved successfully', {
      messages,
    });
  }

  async getChatList(user_email: string) {
    const chats = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.sender_email = :email OR chat.receiver_email = :email', {
        email: user_email,
      })
      .orderBy('chat.createdAt', 'DESC')
      .getMany();

    const chatMap = new Map();

    chats.forEach((chat) => {
      const otherUser =
        chat.sender_email === user_email
          ? chat.receiver_email
          : chat.sender_email;

      if (!chatMap.has(otherUser)) {
        chatMap.set(otherUser, {
          email: otherUser,
          lastMessage: chat.message || 'File attachment',
          lastMessageTime: chat.createdAt,
          unreadCount: 0,
        });
      }

      if (!chat.is_read && chat.receiver_email === user_email) {
        chatMap.get(otherUser).unreadCount += 1;
      }
    });

    return createResponse(true, 'Chat list retrieved successfully', {
      chats: Array.from(chatMap.values()),
    });
  }

  async sendWorkspaceMessage(
    sender_email: string,
    sendWorkspaceMessageDto: SendWorkspaceMessageDto,
  ) {
    const { workspace_id, message, fileUrl } = sendWorkspaceMessageDto;

    await this.isUserInWorkspace(workspace_id, sender_email);

    const newMessage = await this.workspaceMessageRepository.save({
      sender_email,
      workspace_id,
      message,
      fileUrl,
    });
    await this.chatRepository.save(newMessage);

    // get user username only
    const user = await this.userRepository.findOne({
      where: { email: sender_email },
      select: ['username'],
    });
    // get workspace username only
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspace_id },
      select: ['workspace_name'],
    });

    // send notification to mentioned usee
    await this.sendNotificationToMentionedUsers('chat', message, user.username);

    // send new message notification to everyone in the workspace
    await this.sendNotificationForNewMessage(
      workspace_id,
      workspace.workspace_name,
      user.username,
    );

    return createResponse(true, 'Message sent successfully', { newMessage });
  }

  async getWorkspaceMessages(workspace_id: number, sender_email: string) {
    await this.isUserInWorkspace(workspace_id, sender_email);

    const workspaceMessages = await this.workspaceMessageRepository.find({
      where: { workspace_id },
      order: { created_at: 'ASC' },
    });

    if (!workspaceMessages.length) {
      throw new NotFoundException('No message found');
    }

    return createResponse(true, 'Messages retrieved successfully', {
      workspaceMessages,
    });
  }

  async pinMessage(
    message_id: number,
    isPinned: boolean,
    duration: '24h' | '7d' | '30d',
  ) {
    if (!isPinned || !duration) {
      throw new BadRequestException(
        'Both isPinned and duration must be provided',
      );
    }
    const message = await this.workspaceMessageRepository.findOne({
      where: { id: message_id },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const pinnedCount = await this.workspaceMessageRepository.count({
      where: {
        workspace_id: message.workspace_id,
        isPinned: true,
      },
    });

    if (pinnedCount >= 3) {
      throw new BadRequestException('Maximum of 3 pinned message allowed.');
    }

    if (isPinned) {
      const now = new Date();
      const expiresAt = new Date(now);

      switch (duration) {
        case '24h':
          expiresAt.setHours(expiresAt.getHours() + 24);
          break;
        case '7d':
          expiresAt.setDate(expiresAt.getDate() + 7);
          break;
        case '30d':
          expiresAt.setDate(expiresAt.getDate() + 30);
          break;
        default:
          throw new BadRequestException('Invalid duration specified');
      }
    } else {
      message.pinExpiresAt = null;
    }

    // Update the isPinned field
    message.isPinned = isPinned;
    await this.workspaceMessageRepository.save(message);

    return createResponse(true, 'Message pin status updated successfully', {});
  }

  // async deleteMessageInChat(messageId: number, sender_email: string) {
  //   const message = await this.chatRepository.findOne({
  //     where: { id: messageId, sender_email },
  //   });
  
  //   if (!message) {
  //     throw new NotFoundException('Message not found or not authorized.');
  //   }
  
  //   await this.chatRepository.delete(messageId);
  
  //   return createResponse(true, 'Message deleted successfully', {});

  // }

  // async deleteMessageInWorkspace(message_id: number, sender_email: string) {
  //   const message = await this.workspaceMessageRepository.findOne({
  //     where: { id: message_id, sender_email },
  //   });
  
  //   if (!message) {
  //     throw new NotFoundException('Message not found or you are not authorized');
  //   }
  
  //   await this.workspaceMessageRepository.delete(message_id); 

  // }
}
