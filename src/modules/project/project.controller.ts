import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectService } from './project.service';
import { InviteUserDto } from './dto/invite-user.dto';

@ApiTags('project')
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create project' })
  async createProject(@Body() createProjectDto: CreateProjectDto, @Req() req) {
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
    @Req() req,
  ) {
    const user = req.user;
    return await this.projectService.inviteUserToProject(
      projectId,
      inviteUserDto,
      user,
    );
  }
}
