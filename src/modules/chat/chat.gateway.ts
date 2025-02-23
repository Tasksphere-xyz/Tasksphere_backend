/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiExtraModels, ApiTags } from '@nestjs/swagger';

@ApiTags('WebSocket Chat')
@ApiExtraModels(SendMessageDto)
@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  // When a client connects
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  // When a client disconnects
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Listen for new messages from clients using DTO
  @SubscribeMessage('sendMessage')
  @UsePipes(new ValidationPipe()) // Ensures DTO validation
  async handleSendMessage(
    @MessageBody() data: Omit<SendMessageDto, 'sender_email'>, // Using DTO here
    @ConnectedSocket() client: Socket,
  ) {
    const sender_email = client.handshake.auth.email;
    const newMessage = await this.chatService.sendMessage(
      sender_email,
      { ...data, sender_email },
    );

    // Emit the new message to the receiver in real-time
    this.server.to(data.receiver_email).emit('receiveMessage', newMessage);

    return newMessage;
  }

  // Let users join their chat rooms
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() email: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(email); // User joins a room with their email
    console.log(`User ${email} joined chat room`);
  }
}
