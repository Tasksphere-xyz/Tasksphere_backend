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
  
    // Listen for new messages from clients
    @SubscribeMessage('sendMessage')
    async handleSendMessage(
      @MessageBody() data: { sender_email: string; receiver_email: string; project_id: number; message?: string; fileUrl?: string },
      @ConnectedSocket() client: Socket,
    ) {
      const newMessage = await this.chatService.sendMessage(
        data.sender_email,
        data.receiver_email,
        data.project_id,
        data.message,
        data.fileUrl
      );
  
      // Emit the new message to the receiver
      this.server.to(data.receiver_email).emit('receiveMessage', newMessage);
  
      return newMessage;
    }
  
    // Listen for users joining the chat (for real-time updates)
    @SubscribeMessage('joinChat')
    async handleJoinChat(
      @MessageBody() email: string,
      @ConnectedSocket() client: Socket,
    ) {
      client.join(email); // Join a room with the user's email
      console.log(`User ${email} joined chat room`);
    }
}
  