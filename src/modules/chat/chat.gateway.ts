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

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  @UsePipes(new ValidationPipe())
  async handleSendMessage(
    @MessageBody() data: Omit<SendMessageDto, 'sender_email'>,
    @ConnectedSocket() client: Socket,
  ) {
    const sender_email = client.handshake.auth.email;
    const newMessage = await this.chatService.sendMessage(sender_email, {
      ...data,
    });

    // Emit the new message to both sender and receiver within the specific workspace room
    this.server.to(`direct_chat_${data.workspace_id}_${sender_email}`).emit('receiveMessage', newMessage);
    this.server.to(`direct_chat_${data.workspace_id}_${data.receiver_email}`).emit('receiveMessage', newMessage);

    return newMessage;
  }

  // Let users join their direct chat rooms, now scoped by workspace
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { workspace_id: number; user_email: string },
    @ConnectedSocket() client: Socket,
  ) {
    // A user joins a room representing their direct messages within a specific workspace
    client.join(`direct_chat_${data.workspace_id}_${data.user_email}`);
    console.log(`User ${data.user_email} joined direct chat room for workspace ${data.workspace_id}`);
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { message_id: number; workspace_id: number; receiver_email: string }, // Added workspace_id and receiver_email for targeting
    @ConnectedSocket() client: Socket,
  ) {
    const sender_email = client.handshake.auth.email;
    const deletedMessage = await this.chatService.deleteMessageInChat(
      data.message_id,
      sender_email,
    );

    // Emit to both original sender and receiver within the specific workspace room
    this.server.to(`direct_chat_${data.workspace_id}_${sender_email}`).emit('messageDeleted', { messageId: data.message_id });
    this.server.to(`direct_chat_${data.workspace_id}_${data.receiver_email}`).emit('messageDeleted', { messageId: data.message_id });


    return deletedMessage;
  }

  // Video call methods remain peer-to-peer, but consider if they also need workspace scoping.
  // For now, leaving them as global peer-to-peer as they were. If they need to be workspace-scoped,
  // the `data` objects would need a `workspace_id` and rooms would need to be `workspace_${id}_call` or similar.
  @SubscribeMessage('startCall')
  async handleStartCall(
    @MessageBody() data: { caller: string; receiver: string; offer: any },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Call started by ${data.caller} to ${data.receiver}`);
    this.server.to(data.receiver).emit('incomingCall', {
      caller: data.caller,
      offer: data.offer,
    });
  }

  @SubscribeMessage('answerCall')
  async handleAnswerCall(
    @MessageBody() data: { caller: string; receiver: string; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`${data.receiver} answered the call from ${data.caller}`);
    this.server.to(data.caller).emit('callAnswered', {
      receiver: data.receiver,
      answer: data.answer,
    });
  }

  @SubscribeMessage('iceCandidate')
  async handleIceCandidate(
    @MessageBody() data: { sender: string; receiver: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`ICE candidate sent from ${data.sender} to ${data.receiver}`);
    this.server.to(data.receiver).emit('iceCandidate', {
      sender: data.sender,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('endCall')
  async handleEndCall(
    @MessageBody() data: { sender: string; receiver: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Call ended between ${data.sender} and ${data.receiver}`);
    this.server.to(data.receiver).emit('callEnded', { sender: data.sender });
    this.server.to(data.sender).emit('callEnded', { receiver: data.receiver });
  }
}