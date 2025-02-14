/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UserPayload } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/utils/multer.util';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  async getTask(@Param('id') id: number) {
    return await this.taskService.getTaskById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  async updateTask(
    @Param('id') id: number,
    @Body() updateData: Partial<CreateTaskDto>,
  ) {
    return await this.taskService.updateTask(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  async deleteTask(@Param('id') id: number) {
    return await this.taskService.deleteTask(id);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task duplicated successfully' })
  async duplicateTask(
    @Req() req: Request & { user: UserPayload },
    @Param('id') id: number,
  ) {
    return await this.taskService.duplicateTask(req.user, id);
  }

  @Patch('status/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  @ApiResponse({ status: 400, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'ID of the task to be updated' })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
  ) {
    return this.taskService.updateTaskStatus(Number(id), updateTaskStatusDto);
  }

  @Get('/')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiQuery({
    name: 'page',
    required: true,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    type: String,
    description: 'User ID or name of the assigned user',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['newest', 'oldest', 'due-date', 'last-updated'],
    description: 'Sort tasks',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'in-progress', 'completed'],
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['low', 'medium', 'high', 'urgent'],
    description: 'Filter by priority',
  })
  async getAllTasks(
    @Query('page') page: number,
    @Query('assignedTo') assignedTo?: string,
    @Query('sortBy')
    sortBy: 'newest' | 'oldest' | 'due-date' | 'last-updated' = 'newest',
    @Query('status') status?: 'pending' | 'in-progress' | 'completed',
    @Query('priority') priority?: 'low' | 'medium' | 'high' | 'urgent',
  ) {
    return this.taskService.getAllTasks(
      page,
      assignedTo,
      sortBy,
      status,
      priority,
    );
  }
}
