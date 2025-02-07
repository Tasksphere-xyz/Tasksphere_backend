/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { TaskModule } from '../task/task.module';
import { WorkspaceModule } from '../workspace/workspace.module'; 
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TaskModule,
    WorkspaceModule,
  ],
  controllers: [UserController],
  providers: [UserService, CloudinaryProvider],
})
export class UserModule {}
