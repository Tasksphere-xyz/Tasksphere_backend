import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
  async createProject(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    const user = req.user;
    return await this.projectService.createProject(createProjectDto, user);
  }

  @Post(':projectId/invite')
  @UseGuards(JwtAuthGuard)
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
