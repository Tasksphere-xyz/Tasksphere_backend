import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UserPayload } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/utils/multer.util';

@ApiTags('task')
@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: '' })
  @UseInterceptors(FileInterceptor('attachment', multerConfig))
  async createTask(
    @Req() req: Request & { user: UserPayload },
    @Body() createTaskDto: CreateTaskDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = req.user;
    let filePath: string = '';

    if (file) {
      filePath = file.path;
    }
    return await this.taskService.createTask(user, createTaskDto, filePath);
  }
}
