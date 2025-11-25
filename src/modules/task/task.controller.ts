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
import { TaskCronService } from './task-cron.service';

@ApiTags('task')
@Controller('task')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly taskCronService: TaskCronService,
  ) {}

  @Post('create/:contractId')
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data, invalid file type, or file size exceeded' })
  @ApiParam({ name: 'contractId', description: 'id of the contract' })
  @UseInterceptors(FileInterceptor('attachment', multerConfig))
  async createTask(
    @Param('contractId') contractId: string,
    @Req() req: Request & { user: UserPayload },
    @Body() createTaskDto: CreateTaskDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = req.user;
    let filePath: string = '';

    if (file) {
      filePath = file.path;
    }
    return await this.taskService.createTask(contractId, user, createTaskDto, filePath);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 403, description: 'User not authorized to access task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'id', description: 'ID of the task' })
  async getTask(
    @Param('id') id: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    return await this.taskService.getTaskById(id, req.user.email);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data, invalid file type, or file size exceeded' })
  @ApiResponse({ status: 403, description: 'User not authorized to update task' })
  @ApiParam({ name: 'id', description: 'ID of the task' })
  @UseInterceptors(FileInterceptor('attachment', multerConfig))
  async updateTask(
    @Param('id') id: number,
    @Body() updateData: Partial<CreateTaskDto>,
    @Req() req: Request & { user: UserPayload },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let filePath: string = '';
    if (file) {
      filePath = file.path;
    }
    return await this.taskService.updateTask(id, updateData, req.user.email, filePath);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 400, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'User not authorized to delete task' })
  @ApiParam({ name: 'id', description: 'ID of the task' })
  async deleteTask(
    @Param('id') id: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    return await this.taskService.deleteTask(id, req.user.email);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task duplicated successfully' })
  @ApiResponse({ status: 403, description: 'User not authorized to duplicate task' })
  @ApiParam({ name: 'id', description: 'ID of the task to duplicate' })
  async duplicateTask(
    @Req() req: Request & { user: UserPayload },
    @Param('id') id: number,
  ) {
    return await this.taskService.duplicateTask(req.user, id);
  }

  @Patch('status/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  @ApiResponse({ status: 400, description: 'Task not found or invalid status' })
  @ApiResponse({ status: 403, description: 'User not authorized to update task status' })
  @ApiParam({ name: 'id', description: 'ID of the task to be updated' })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    return this.taskService.updateTaskStatus(Number(id), updateTaskStatusDto, req.user.email);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Task history retrieved successfully',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'workspaceId',
    required: false,
    type: Number,
    description: 'ID of the workspace to filter task history by. If not provided, history from all user workspaces are returned.',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    type: Number,
    description: 'User ID of the assigned user',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ['status-change', 'assignment'],
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (YYYY-MM-DD)',
  })
  async getTaskHistory(
    @Req() req: Request & { user: UserPayload },
    @Query('page') page: number = 1,
    @Query('workspaceId') workspaceId?: number,
    @Query('assignedTo') assignedTo?: number,
    @Query('action') action?: 'status-change' | 'assignment',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.taskService.getAllTaskHistory(
      req.user.email,
      page,
      workspaceId,
      assignedTo,
      action,
      from,
      to,
    );
  }

  @Get('/')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'workspaceId',
    required: false,
    type: Number,
    description: 'ID of the workspace to filter tasks by. If not provided, tasks from all user workspaces are returned.',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    type: Number,
    description: 'User ID of the assigned user',
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
    @Req() req: Request & { user: UserPayload },
    @Query('page') page: number = 1,
    @Query('workspaceId') workspaceId?: number,
    @Query('assignedTo') assignedTo?: number,
    @Query('sortBy')
    sortBy: 'newest' | 'oldest' | 'due-date' | 'last-updated' = 'newest',
    @Query('status') status?: 'pending' | 'in-progress' | 'completed',
    @Query('priority') priority?: 'low' | 'medium' | 'high' | 'urgent',
  ) {
    return this.taskService.getAllTasks(
      req.user.email,
      page,
      workspaceId,
      assignedTo,
      sortBy,
      status,
      priority,
    );
  }

  @Post('cron/task-deadline-notification')
  async triggerTaskDeadlineCron() {
    await this.taskCronService.notifyTaskDeadlines();
    return 'Task deadline cron job executed manually';
  }
}