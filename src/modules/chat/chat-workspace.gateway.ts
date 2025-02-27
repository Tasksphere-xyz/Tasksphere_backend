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
import { SendWorkspaceMessageDto } from './dto/send-workspace-message.dto';

@ApiTags('WebSocket Workspace Chat')
@ApiExtraModels(SendMessageDto)
@WebSocketGateway({ cors: true })
export class ChatWorkspaceGateway {
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

  @SubscribeMessage('sendWorkspaceMessage')
  @UsePipes(new ValidationPipe())
  async handleSendWorkspaceMessage(
    @MessageBody() data: Omit<SendWorkspaceMessageDto, 'sender_email'>,
    @ConnectedSocket() client: Socket,
  ) {
    const sender_email = client.handshake.auth.email;

    const newMessage = await this.chatService.sendWorkspaceMessage(
      sender_email,
      { ...data, sender_email },
    );

    // Emit to all members of the workspace room
    this.server
      .to(`workspace_${data.workspace_id}`)
      .emit('receiveWorkspaceMessage', newMessage);

    return newMessage;
  }

  @SubscribeMessage('joinWorkspace')
  async handleJoinWorkspace(
    @MessageBody() workspace_id: number,
    @ConnectedSocket() client: Socket,
  ) {
    const user_email = client.handshake.auth.email;
    await this.chatService.isUserInWorkspace(workspace_id, user_email);

    client.join(`workspace_${workspace_id}`);
    console.log(`User ${user_email} joined workspace ${workspace_id}`);
  }

  // @SubscribeMessage('deleteWorkspaceMessage')
  // async handleDeleteWorkspaceMessage(
  //   @MessageBody() data: { message_id: number; workspace_id: number },
  //   @ConnectedSocket() client: Socket,
  // ) {
  //   const sender_email = client.handshake.auth.email;

  //   // Check if user is in the workspace
  //   await this.chatService.isUserInWorkspace(data.workspace_id, sender_email);

  //   // Delete the message
  //   await this.chatService.deleteMessageInWorkspace
  //     data.message_id,
  //     sender_email,
  //   );

  //   // Emit the message deletion event to all members in the workspace
  //   this.server
  //     .to(`workspace_${data.workspace_id}`)
  //     .emit('workspaceMessageDeleted', data.message_id);
  // }
}
