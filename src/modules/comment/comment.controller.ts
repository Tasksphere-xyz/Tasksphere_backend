import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Delete,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment';
import { CreateReplyDto } from './dto/create-reply';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UserPayload } from 'express';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createResponse } from 'src/common/dto/response.dto';

@ApiTags('comment')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('/:task_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Task not found' })
  @ApiParam({ name: 'task_id', description: 'ID of the task' })
  async createComment(
    @Param('task_id') task_id: number,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return this.commentService.createComment(task_id, createCommentDto, user);
  }

  @Post('reply/:comment_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Reply created successfully' })
  @ApiResponse({ status: 400, description: 'Comment not found' })
  @ApiParam({ name: 'comment_id', description: 'ID of the comment' })
  async createReply(
    @Param('comment_id') comment_id: number,
    @Body() createReplyDto: CreateReplyDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return this.commentService.createReply(comment_id, createReplyDto, user);
  }

  @Get('/:task_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Task not found' })
  @ApiParam({ name: 'task_id', description: 'ID of the task' })
  @ApiQuery({
    name: 'page',
    required: true,
    description: 'Page number for pagination',
  })
  async getCommentsForTask(
    @Param('task_id') task_id: number,
    @Query('page') page: number,
  ) {
    return this.commentService.getCommentsForTask(task_id, page);
  }

  @Get('reply/:comment_id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Comment not found' })
  @ApiParam({ name: 'comment_id', description: 'ID of the comment' })
  @ApiQuery({
    name: 'page',
    required: true,
    description: 'Page number for pagination',
  })
  async getRepliesForComments(
    @Param('comment_id') comment_id: number,
    @Query('page') page: number,
  ) {
    return this.commentService.getRepliesForComments(comment_id, page);
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 400, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'ID of the comment' })
  async deleteComment(
    @Param('id') id: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user_email = req.user.email;
    return await this.commentService.deleteComment(id, user_email);
  }

  @Delete('reply/:id')
  @ApiResponse({ status: 200, description: 'Reply deleted successfully' })
  @ApiResponse({ status: 400, description: 'Reply not found' })
  @ApiParam({ name: 'id', description: 'ID of the reply' })
  @UseGuards(JwtAuthGuard)
  async deleteReply(
    @Param('id') id: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user_email = req.user.email;
    return await this.commentService.deleteReply(id, user_email);
  }
}
