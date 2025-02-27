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
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  async sendMessage(@Req() req, @Body() sendMessageDto: SendMessageDto) {
    const sender_email = req.user.email;
    return await this.chatService.sendMessage(sender_email, sendMessageDto);
  }

  @Get('messages/:project_id/:receiver_email')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Messages not found' })
  @ApiParam({ name: 'project_id', description: 'Project ID' })
  @ApiParam({ name: 'receiver_email', description: 'Receiver email' })
  async getMessages(
    @Param('project_id') project_id: number,
    @Param('receiver_email') receiver_email: string,
    @Req() req,
  ) {
    const sender_email = req.user.email;
    return await this.chatService.getMessages(
      sender_email,
      receiver_email,
      project_id,
    );
  }

  @Get('chatlist')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Chat list retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Chat not found' })
  async getChatList(@Req() req) {
    const user_email = req.user.email;
    return await this.chatService.getChatList(user_email);
  }

  @Post('workspace/send')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
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
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Messages not found' })
  @ApiParam({ name: 'workspace_id', description: 'Project ID' })
  async getWorkspaceMessages(
    @Param('workspace_id') workspace_id: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const email = req.user.email;
    return await this.chatService.getWorkspaceMessages(workspace_id, email);
  }

  @Patch('pin/:message_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Message pin status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Message not found' })
  @ApiParam({ name: 'message_id', description: 'ID of the message' })
  @ApiQuery({ name: 'isPinned', description: 'Query to pin messages' })
  @ApiQuery({
    name: 'duration',
    description: 'Duration for pinned messages',
    example: '24h | 7d | 30d',
  })
  async pinMessage(
    @Param('message_id') message_id: number,
    @Query('isPinned') isPinned: boolean,
    @Query('duration') duration: '24h' | '7d' | '30d',
  ) {
    return await this.chatService.pinMessage(message_id, isPinned, duration);
  }

  @Delete('delete/:message_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
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
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
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
