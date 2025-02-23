/* eslint-disable prettier/prettier */
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { ChatMessage } from 'src/entities/chat-message.entity';
  import { ProjectMembership } from 'src/entities/project-membership.entity';
  import { createResponse } from 'src/common/dto/response.dto';
  
  @Injectable()
  export class ChatService {
    constructor(
      @InjectRepository(ChatMessage)
      private chatRepository: Repository<ChatMessage>,
      
      @InjectRepository(ProjectMembership)
      private projectMembershipRepository: Repository<ProjectMembership>,
    ) {}
  
    async sendMessage(
      sender_email: string,
      receiver_email: string,
      project_id: number,
      message?: string,
      fileUrl?: string,
    ) {
      // Verify both users are part of the same project
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
  
    async getMessages(sender_email: string, receiver_email: string, project_id: number) {
      const messages = await this.chatRepository.find({
        where: [
          { sender_email, receiver_email, project_id },
          { sender_email: receiver_email, receiver_email: sender_email, project_id },
        ],
        order: { createdAt: 'ASC' },
      });
  
      if (!messages.length) {
        throw new NotFoundException('No messages found between these users.');
      }
  
      // Mark unread messages as read
      await this.chatRepository.update(
        { sender_email: receiver_email, receiver_email: sender_email, project_id, is_read: false },
        { is_read: true }
      );
  
      return createResponse(true, 'Messages retrieved successfully', { messages });
    }
  
    async getChatList(user_email: string) {
      const chats = await this.chatRepository
        .createQueryBuilder('chat')
        .where('chat.sender_email = :email OR chat.receiver_email = :email', { email: user_email })
        .orderBy('chat.createdAt', 'DESC')
        .getMany();
  
      const chatMap = new Map();
  
      chats.forEach(chat => {
        const otherUser = chat.sender_email === user_email ? chat.receiver_email : chat.sender_email;
        if (!chatMap.has(otherUser)) {
          chatMap.set(otherUser, {
            email: otherUser,
            lastMessage: chat.message || 'File attachment',
            unreadCount: 0,
          });
        }
        if (!chat.is_read && chat.receiver_email === user_email) {
          chatMap.get(otherUser).unreadCount += 1;
        }
      });
  
      return createResponse(true, 'Chat list retrieved successfully', { chats: Array.from(chatMap.values()) });
    }
  }
  