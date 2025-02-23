/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@ApiBearerAuth() 
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
    return await this.chatService.getMessages(sender_email, receiver_email, project_id);
  }

  @Get('chatlist')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Chat list retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Chat not found' })
  async getChatList(@Req() req) {
    const user_email = req.user.email;
    return await this.chatService.getChatList(user_email);
  }
}
