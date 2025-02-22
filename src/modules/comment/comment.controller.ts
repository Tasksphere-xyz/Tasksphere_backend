import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment';
import { CreateReplyDto } from './dto/create-reply';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UserPayload } from 'express';
import { ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

@Controller('/comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post('/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'ID of the task' })
  async createComment(
    @Param('id') id: number,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return this.commentService.createComment(id, createCommentDto, user);
  }

  @Post('reply/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Reply created successfully' })
  @ApiResponse({ status: 400, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'ID of the comment' })
  async createReply(
    @Param('id') id: number,
    @Body() createReplyDto: CreateReplyDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return this.commentService.createReply(id, createReplyDto, user);
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'ID of the task' })
  @ApiQuery({
    name: 'page',
    required: true,
    description: 'Page number for pagination',
  })
  async getCommentsForTask(
    @Param('id') id: number,
    @Query('page') page: number,
  ) {
    return this.commentService.getCommentsForTask(id, page);
  }

  @Get('reply/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'ID of the comment' })
  @ApiQuery({
    name: 'page',
    required: true,
    description: 'Page number for pagination',
  })
  async getRepliesForComments(
    @Param('id') id: number,
    @Query('page') page: number,
  ) {
    return this.commentService.getRepliesForComments(id, page);
  }
}
