/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendWorkspaceMessageDto } from './dto/send-workspace-message.dto';
import { UserPayload } from 'express';
import { ChatCronService } from './chat-cron.service';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatCronService: ChatCronService,
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Direct message sent successfully within workspace' })
  async sendMessage(@Req() req: Request & { user: UserPayload }, @Body() sendMessageDto: SendMessageDto) {
    const sender_email = req.user.email;
    return await this.chatService.sendMessage(sender_email, sendMessageDto);
  }

  // getMessages: Now includes :workspace_id in path
  @Get('messages/:workspace_id/:receiver_email')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Direct messages retrieved successfully within workspace' })
  @ApiResponse({ status: 400, description: 'Messages not found or user not in workspace' })
  @ApiParam({ name: 'workspace_id', description: 'Workspace ID' })
  @ApiParam({ name: 'receiver_email', description: 'Receiver email' })
  async getMessages(
    @Param('workspace_id') workspace_id: string,
    @Param('receiver_email') receiver_email: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const sender_email = req.user.email;
    return await this.chatService.getMessages(
      sender_email,
      receiver_email,
      Number(workspace_id),
    );
  }

  @Get('chatlist')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Chat list per workspace retrieved successfully' })
  @ApiResponse({ status: 400, description: 'No chats found' })
  async getChatList(@Req() req: Request & { user: UserPayload }) {
    const user_email = req.user.email;
    return await this.chatService.getChatList(user_email);
  }

  @Post('workspace/send')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Workspace message sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'User must be a member of workspace',
  })
  async sendWorkspaceMessage(
    @Req() req: Request & { user: UserPayload },
    @Body() sendWorkspaceMessageDto: SendWorkspaceMessageDto,
  ) {
    const sender_email = req.user.email;
    return await this.chatService.sendWorkspaceMessage(
      sender_email,
      sendWorkspaceMessageDto,
    );
  }

  @Get('workspace/:workspace_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Workspace messages retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Messages not found' })
  @ApiParam({ name: 'workspace_id', description: 'Workspace ID' })
  async getWorkspaceMessages(
    @Param('workspace_id') workspace_id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const email = req.user.email;
    return await this.chatService.getWorkspaceMessages(Number(workspace_id), email);
  }

  @Patch('pin/:message_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Message pin status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Message not found' })
  @ApiParam({ name: 'message_id', description: 'ID of the message' })
  @ApiQuery({ name: 'isPinned', description: 'Query to pin messages', type: Boolean })
  @ApiQuery({
    name: 'duration',
    description: 'Duration for pinned messages',
    enum: ['24h', '7d', '30d'],
    required: false
  })
  async pinMessage(
    @Param('message_id') message_id: number,
    @Query('isPinned') isPinned: boolean,
    @Query('duration') duration: '24h' | '7d' | '30d',
  ) {
    const isPinnedBoolean = String(isPinned).toLowerCase() === 'true';
    return await this.chatService.pinMessage(message_id, isPinnedBoolean, duration);
  }

  @Delete('delete/:message_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Direct message deleted successfully' })
  @ApiResponse({ status: 400, description: 'Message not found' })
  @ApiParam({ name: 'message_id', description: 'ID of the message' })
  async deleteMessageInChat(
    @Param('message_id') message_id: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const sender_email = req.user.email;
    return await this.chatService.deleteMessageInChat(message_id, sender_email);
  }

  @Delete('workspace/delete/:message_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Workspace message deleted successfully' })
  @ApiResponse({ status: 400, description: 'Message not found' })
  @ApiParam({ name: 'message_id', description: 'ID of the message' })
  async deleteMessageInWorkspace(
    @Param('message_id') message_id: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const sender_email = req.user.email;
    return await this.chatService.deleteMessageInWorkspace(
      message_id,
      sender_email,
    );
  }

  @Post('cron/unpin-expired-messages')
  async triggerPaymentCron() {
    await this.chatCronService.unpinExpiredMessages();
    return 'Cron job executed manually';
  }
}