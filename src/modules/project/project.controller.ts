/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectService } from './project.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UserPayload } from 'express';

@ApiTags('project')
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create project' })
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.projectService.createProject(createProjectDto, user);
  }

  @Post(':projectId/invite')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'User invited to project successfully',
  })
  @ApiResponse({ status: 400, description: 'Unauthorized access' })
  @ApiParam({ name: 'projectId', description: 'id of the project' })
  async inviteToProject(
    @Param('projectId') projectId: number,
    @Body() inviteUserDto: InviteUserDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.projectService.inviteUserToProject(
      projectId,
      inviteUserDto,
      user,
    );
  }

  @Get(':projectId/members')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Project members fetched successfully',
  })
  @ApiResponse({ status: 400, description: 'Project not found' })
  @ApiParam({ name: 'projectId', description: 'id of the project' })
  @ApiQuery({
    name: 'page',
    required: true,
    description: 'Page number for pagination',
  })
  async getProjectMembers(
    @Param('projectId') projectId: number,
    @Req() req: Request & { user: UserPayload },
    @Query('page') page: number,
  ) {
    const user = req.user;
    return this.projectService.getProjectMembers(projectId, user, page);
  }

  @Post(':projectId/join')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'User successfully joined the project',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid invitation or project does not exist',
  })
  @ApiParam({ name: 'projectId', description: 'ID of the project' })
  async joinProject(
    @Param('projectId') projectId: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.projectService.joinProject(projectId, user);
  }
}
