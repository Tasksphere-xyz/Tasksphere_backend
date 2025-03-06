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
    const newMessage = await this.chatService.sendMessage(sender_email, {
      ...data,
      sender_email,
    });

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

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody('message_id') messageId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const sender_email = client.handshake.auth.email;
    const deletedMessage = await this.chatService.deleteMessageInChat(
      messageId,
      sender_email,
    );

    // Broadcast to both sender and receiver to remove the message in real-time
    this.server.emit('messageDeleted', { messageId });

    return deletedMessage;
  }

  // Handle a user starting a call (Send WebRTC Offer)
  @SubscribeMessage('startCall')
  async handleStartCall(
    @MessageBody() data: { caller: string; receiver: string; offer: any },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Call started by ${data.caller} to ${data.receiver}`);

    // Emit the WebRTC offer to the receiver
    this.server.to(data.receiver).emit('incomingCall', {
      caller: data.caller,
      offer: data.offer,
    });
  }

  // Handle a user accepting a call (Send WebRTC Answer)
  @SubscribeMessage('answerCall')
  async handleAnswerCall(
    @MessageBody() data: { caller: string; receiver: string; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`${data.receiver} answered the call from ${data.caller}`);

    // Emit the WebRTC answer to the caller
    this.server.to(data.caller).emit('callAnswered', {
      receiver: data.receiver,
      answer: data.answer,
    });
  }

  // Handle ICE Candidate Exchange
  @SubscribeMessage('iceCandidate')
  async handleIceCandidate(
    @MessageBody() data: { sender: string; receiver: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`ICE candidate sent from ${data.sender} to ${data.receiver}`);

    // Forward ICE candidate to the other user
    this.server.to(data.receiver).emit('iceCandidate', {
      sender: data.sender,
      candidate: data.candidate,
    });
  }

  // Handle Call End
  @SubscribeMessage('endCall')
  async handleEndCall(
    @MessageBody() data: { sender: string; receiver: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Call ended between ${data.sender} and ${data.receiver}`);

    // Notify both users to end the call
    this.server.to(data.receiver).emit('callEnded', { sender: data.sender });
    this.server.to(data.sender).emit('callEnded', { receiver: data.receiver });
  }
}
