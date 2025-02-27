import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Comment } from 'src/entities/comment.entity';
import { Reply } from 'src/entities/reply.entity';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment';
import { UserPayload } from 'express';
import { CreateReplyDto } from './dto/create-reply';
import { createResponse } from 'src/common/dto/response.dto';
import { UserService } from '../user/user.service';
import { TaskService } from '../task/task.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Reply)
    private readonly replyRepository: Repository<Reply>,
    private readonly userService: UserService,
    private readonly taskService: TaskService,
    private readonly chatService: ChatService,
  ) {}

  public async findCommentById(id: number): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException(`Comment not found`);
    }

    return comment;
  }

  async createComment(
    task_id: number,
    createCommentDto: CreateCommentDto,
    user: UserPayload,
  ) {
    const { content } = createCommentDto;

    await this.taskService.findTaskById(task_id);
    const foundUser = await this.userService.findUserByEmail(user.email);

    const comment = this.commentRepository.create({
      task_id,
      user: foundUser,
      content,
    });

    await this.commentRepository.save(comment);

    await this.chatService.sendNotificationToMentionedUsers(
      'comment',
      content,
      foundUser.username,
    );

    return createResponse(true, 'comment created successfully', {
      comment,
    });
  }

  async createReply(
    commentId: number,
    createReplyDto: CreateReplyDto,
    user: UserPayload,
  ) {
    const { content } = createReplyDto;

    const comment = await this.findCommentById(commentId);
    const foundUser = await this.userService.findUserByEmail(user.email);

    const reply = this.replyRepository.create({
      user: foundUser,
      comment,
      content,
    });
    await this.replyRepository.save(reply);

    await this.chatService.sendNotificationToMentionedUsers(
      'reply',
      content,
      foundUser.username,
    );

    return createResponse(true, 'reply created successfully', {
      reply,
    });
  }

  async getCommentsForTask(taskId: number, page: number) {
    page = page > 0 ? page : 1;
    const limit = 5;

    const skip = (page - 1) * limit;

    await this.taskService.findTaskById(taskId);

    const [comments, total] = await this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .select([
        'comment.id',
        'comment.task_id',
        'comment.content',
        'comment.createdAt',
        'comment.updatedAt',
        'user.username',
        'user.displayPic',
      ])
      .where('comment.task_id = :taskId', { taskId })
      .orderBy('comment.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    const message =
      comments.length === 0
        ? 'no comments found'
        : 'comments retrieved successfully';

    return createResponse(true, message, {
      comments,
      totalPages: totalPages === 0 ? 1 : totalPages,
      currentPage: page,
    });
  }

  async getRepliesForComments(commentId: number, page: number) {
    page = page > 0 ? page : 1;
    const limit = 10;

    const skip = (page - 1) * limit;

    await this.findCommentById(commentId);

    const [replies, total] = await this.replyRepository
      .createQueryBuilder('reply')
      .leftJoinAndSelect('reply.user', 'user')
      .leftJoinAndSelect('reply.comment', 'comment')
      .select([
        'reply.id',
        'comment.id',
        'reply.content',
        'reply.createdAt',
        'reply.updatedAt',
        'user.username',
        'user.displayPic',
      ])
      .where('comment.id = :commentId', { commentId })
      .orderBy('reply.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    const message =
      replies.length === 0
        ? 'no replies found'
        : 'replies retrieved successfully';

    return createResponse(true, message, {
      replies,
      totalPages: totalPages === 0 ? 1 : totalPages,
      currentPage: page,
    });
  }

  // async deleteComment(id: number, user_email: string) {
  //   const comment = await this.commentRepository.findOne({
  //     where: { id },
  //     relations: ['user'],
  //   });

  //   if (!comment) {
  //     throw new NotFoundException('Comment not found');
  //   }

  //   if (comment.user.email !== user_email) {
  //     throw new UnauthorizedException('You are not authorized to delete this comment');
  //   }

  //   await this.commentRepository.delete(id);
  // }

  // async deleteReply(id: number, user_email: string) {
  //   const reply = await this.replyRepository.findOne({
  //     where: { id },
  //     relations: ['user'],
  //   });

  //   if (!reply) {
  //     throw new NotFoundException('Reply not found');
  //   }

  //   if (reply.user.email !== user_email) {
  //     throw new UnauthorizedException('You are not authorized to delete this reply');
  //   }

  //   await this.replyRepository.delete(id);
  // }
}
