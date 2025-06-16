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

  public async checkUserInWorkspace(workspace_id: number, email: string) {
    const membership = await this.workspaceMembershipRepository.findOne({
      where: { workspace_id, email, status: 'accepted' },
    });
    if (!membership) {
      throw new ForbiddenException('User is not a member of this workspace.');
    }
    return membership;
  }

  public getFirstFiveWords(text: string): string {
    const words = text.split(/\s+/);
    const firstFive = words.slice(0, 5);
    return firstFive.join(' ');
  }

  public async sendNotificationToMentionedUsers(
    messageContext: string,
    message: string,
    sender_name: string,
  ) {
    const mentionRegex = /@(\w+)\(([^)]+)\)/g;
    const mentions: { username: string; email: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(message)) !== null) {
      if (match[1] && match[2]) {
        mentions.push({ username: match[1], email: match[2] });
      }
    }
    if (mentions.length === 0) {
      return;
    }
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
    message: string,
  ) {
    const arrayOfEmail =
      await this.workspaceService.getAllEmailOfMembersOfWorkspace(workspace_id);
    if (arrayOfEmail.length > 0) {
      await this.notificationService.sendNotification(
        arrayOfEmail,
        NotificationType.NEW_MESSAGE,
        `New Message in ${workspace_name} workspace`,
        `${sender_name} sent a new message in #${workspace_name}: ${this.getFirstFiveWords(
          message,
        )}`,
      );
    }
  }

  async sendMessage(sender_email: string, sendMessageDto: SendMessageDto) {
    const { receiver_email, workspace_id, message, fileUrl } = sendMessageDto;

    await this.checkUserInWorkspace(workspace_id, sender_email);

    await this.checkUserInWorkspace(workspace_id, receiver_email);

    // Save message
    const newMessage = this.chatRepository.create({
      sender_email,
      receiver_email,
      workspace_id,
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
    workspace_id: number,
  ) {
    await this.checkUserInWorkspace(workspace_id, sender_email);
    await this.checkUserInWorkspace(workspace_id, receiver_email);

    const messages = await this.chatRepository.find({
      where: [
        { sender_email, receiver_email, workspace_id },
        {
          sender_email: receiver_email,
          receiver_email: sender_email,
          workspace_id,
        },
      ],
      order: { createdAt: 'ASC' },
    });

    if (!messages.length) {
      throw new NotFoundException('No messages found between these users in this workspace.');
    }

    await this.chatRepository.update(
      {
        sender_email: receiver_email,
        receiver_email: sender_email,
        workspace_id,
        is_read: false,
      },
      { is_read: true },
    );

    return createResponse(true, 'Messages retrieved successfully', {
      messages,
    });
  }

  async getChatList(user_email: string) {
    const userWorkspaces = await this.workspaceMembershipRepository.find({
      where: { email: user_email, status: 'accepted' },
      relations: ['workspace'], // This correctly loads the related Workspace entity
    });

    if (!userWorkspaces.length) {
      throw new NotFoundException('No workspaces found for this user, hence no chats.');
    }

    const workspacesWithChats: any[] = [];

    for (const userWorkspace of userWorkspaces) {
      // CORRECTED LINES:
      const workspaceId = userWorkspace.workspace.id;
      const workspaceName = userWorkspace.workspace.workspace_name;

      const directChatPartners = await this.chatRepository
        .createQueryBuilder('chat')
        .select('DISTINCT CASE WHEN chat.sender_email = :userEmail THEN chat.receiver_email ELSE chat.sender_email END', 'otherUserEmail')
        .where('chat.workspace_id = :workspaceId', { workspaceId })
        .andWhere('(chat.sender_email = :userEmail OR chat.receiver_email = :userEmail)', { userEmail: user_email })
        .getRawMany();

      const chatsInWorkspace: any[] = [];

      for (const partner of directChatPartners) {
        const otherUserEmail = partner.otherUserEmail;

        const latestMessage = await this.chatRepository.findOne({
            where: [
                { sender_email: user_email, receiver_email: otherUserEmail, workspace_id: workspaceId },
                { sender_email: otherUserEmail, receiver_email: user_email, workspace_id: workspaceId },
            ],
            order: { createdAt: 'DESC' },
            select: ['message', 'fileUrl', 'createdAt', 'is_read', 'sender_email', 'receiver_email'],
        });

        if (latestMessage) {
            const unreadCount = await this.chatRepository.count({
                where: {
                    sender_email: otherUserEmail,
                    receiver_email: user_email,
                    workspace_id: workspaceId,
                    is_read: false,
                },
            });

            const otherUser = await this.userRepository.findOne({
                where: { email: otherUserEmail },
                select: ['username'],
            });

            chatsInWorkspace.push({
                otherUser: {
                    email: otherUserEmail,
                    username: otherUser ? otherUser.username : otherUserEmail,
                },
                lastMessage: latestMessage.message || (latestMessage.fileUrl ? 'File attachment' : ''),
                lastMessageTime: latestMessage.createdAt,
                unreadCount: unreadCount,
            });
        }
      }

      if (chatsInWorkspace.length > 0) {
        chatsInWorkspace.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
        workspacesWithChats.push({
          workspace: { id: workspaceId, name: workspaceName },
          directChats: chatsInWorkspace,
        });
      }
    }

    if (workspacesWithChats.length === 0) {
        throw new NotFoundException('No active direct chats found in your workspaces.');
    }

    return createResponse(true, 'Chat list retrieved successfully', {
      workspacesWithChats: workspacesWithChats,
    });
  }

  async sendWorkspaceMessage(
    sender_email: string,
    sendWorkspaceMessageDto: SendWorkspaceMessageDto,
  ) {
    const { workspace_id, message, fileUrl } = sendWorkspaceMessageDto;

    await this.checkUserInWorkspace(workspace_id, sender_email); // Ensure sender is member

    const newMessage = this.workspaceMessageRepository.create({
      sender_email,
      workspace_id,
      message,
      fileUrl,
    });
    await this.workspaceMessageRepository.save(newMessage);

    const user = await this.userRepository.findOne({
      where: { email: sender_email },
      select: ['username'],
    });
    if (!user) throw new NotFoundException('Sender user not found');

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspace_id },
      select: ['workspace_name'],
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    await this.sendNotificationToMentionedUsers('workspace chat', message, user.username);

    await this.sendNotificationForNewMessage(
      workspace_id,
      workspace.workspace_name,
      user.username,
      message,
    );

    return createResponse(true, 'Message sent successfully', { newMessage });
  }

  async getWorkspaceMessages(workspace_id: number, sender_email: string) {
    await this.checkUserInWorkspace(workspace_id, sender_email); // Ensure user is member

    const workspaceMessages = await this.workspaceMessageRepository.find({
      where: { workspace_id },
      order: { created_at: 'ASC' },
    });

    if (!workspaceMessages.length) {
      throw new NotFoundException('No messages found in this workspace.');
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

    if (isPinned) {
      if (pinnedCount >= 3) {
        throw new BadRequestException('Maximum of 3 pinned messages allowed.');
      }

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
      message.pinExpiresAt = expiresAt;
    } else {
      message.pinExpiresAt = null;
    }

    message.isPinned = isPinned;
    await this.workspaceMessageRepository.save(message);

    return createResponse(
      true,
      `Message pin status updated to ${isPinned}`,
      {},
    );
  }

  async deleteMessageInChat(message_id: number, sender_email: string) {
    const message = await this.chatRepository.findOne({
      where: { id: message_id },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_email !== sender_email) {
      throw new ForbiddenException('You cannot delete this message');
    }

    await this.chatRepository.delete(message_id);

    return createResponse(true, 'Message deleted successfully', {});
  }

  async deleteMessageInWorkspace(
    message_id: number,
    sender_email: string,
  ) {
    const message = await this.workspaceMessageRepository.findOne({
      where: { id: message_id, },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_email !== sender_email) {
      throw new ForbiddenException('You cannot delete this message');
    }

    await this.workspaceMessageRepository.delete(message_id);

    return createResponse(true, 'Message deleted successfully', {});
  }
}