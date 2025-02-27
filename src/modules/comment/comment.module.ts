import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { Comment } from 'src/entities/comment.entity';
import { Reply } from 'src/entities/reply.entity';
import { User } from 'src/entities/user.entity';
import { Task } from 'src/entities/task.entity';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, User, Task, Reply]),
    TaskModule,
    UserModule,
    ChatModule,
  ],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
