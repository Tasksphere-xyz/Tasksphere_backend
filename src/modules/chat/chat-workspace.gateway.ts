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

  @SubscribeMessage('deleteWorkspaceMessage')
  async handleDeleteWorkspaceMessage(
    @MessageBody() data: { message_id: number; workspace_id: number },
    @ConnectedSocket() client: Socket,
  ) {
    const sender_email = client.handshake.auth.email;

    // Delete the message
    const deletedMessage = await this.chatService.deleteMessageInWorkspace(
      data.message_id,
      sender_email,
    );

    // Emit the message deletion event to all members in the workspace
    this.server
      .to(`workspace_${data.workspace_id}`)
      .emit('workspaceMessageDeleted', data.message_id);

    return deletedMessage;
  }

   /**
   * Start a group call in the workspace
   * @param data { workspace_id: number; caller: string; offer: any }
   */
   @SubscribeMessage('startWorkspaceCall')
   async handleStartWorkspaceCall(
     @MessageBody() data: { workspace_id: number; caller: string; offer: any },
     @ConnectedSocket() client: Socket,
   ) {
     console.log(
       `Workspace call started by ${data.caller} in workspace ${data.workspace_id}`,
     );
 
     // Notify all members in the workspace about the incoming group call
     this.server.to(`workspace_${data.workspace_id}`).emit('incomingWorkspaceCall', {
       caller: data.caller,
       offer: data.offer,
     });
   }
 
   /**
    * Handle user answering a group call
    * @param data { workspace_id: number; responder: string; answer: any }
    */
   @SubscribeMessage('answerWorkspaceCall')
   async handleAnswerWorkspaceCall(
     @MessageBody() data: { workspace_id: number; responder: string; answer: any },
     @ConnectedSocket() client: Socket,
   ) {
     console.log(
       `${data.responder} answered the workspace call in workspace ${data.workspace_id}`,
     );
 
     // Notify the caller and other users about the response
     this.server.to(`workspace_${data.workspace_id}`).emit('workspaceCallAnswered', {
       responder: data.responder,
       answer: data.answer,
     });
   }
 
   /**
    * Handle ICE Candidate Exchange for group call
    * @param data { workspace_id: number; sender: string; candidate: any }
    */
   @SubscribeMessage('workspaceIceCandidate')
   async handleWorkspaceIceCandidate(
     @MessageBody() data: { workspace_id: number; sender: string; candidate: any },
     @ConnectedSocket() client: Socket,
   ) {
     console.log(
       `ICE candidate sent from ${data.sender} in workspace ${data.workspace_id}`,
     );
 
     // Forward ICE candidate to all other users in the workspace call
     this.server.to(`workspace_${data.workspace_id}`).emit('workspaceIceCandidate', {
       sender: data.sender,
       candidate: data.candidate,
     });
   }
 
   /**
    * Handle user leaving a group call
    * @param data { workspace_id: number; user: string }
    */
   @SubscribeMessage('leaveWorkspaceCall')
   async handleLeaveWorkspaceCall(
     @MessageBody() data: { workspace_id: number; user: string },
     @ConnectedSocket() client: Socket,
   ) {
     console.log(
       `${data.user} left the workspace call in workspace ${data.workspace_id}`,
     );
 
     // Notify all other participants that the user has left
     this.server.to(`workspace_${data.workspace_id}`).emit('workspaceCallLeft', {
       user: data.user,
     });
   }
 
   /**
    * Handle ending a workspace group call
    * @param data { workspace_id: number; initiator: string }
    */
   @SubscribeMessage('endWorkspaceCall')
   async handleEndWorkspaceCall(
     @MessageBody() data: { workspace_id: number; initiator: string },
     @ConnectedSocket() client: Socket,
   ) {
     console.log(
       `Workspace call ended by ${data.initiator} in workspace ${data.workspace_id}`,
     );
 
     // Notify all users in the workspace to end the call
     this.server.to(`workspace_${data.workspace_id}`).emit('workspaceCallEnded', {
       initiator: data.initiator,
     });
   }
}
