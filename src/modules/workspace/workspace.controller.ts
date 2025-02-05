import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from '../project/dto/invite-user.dto';

@ApiTags('workspace')
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('create/:projectId')
  @UseGuards(JwtAuthGuard)
  async createProject(
    @Param('projectId') projectId: string,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Req() req,
  ) {
    const user = req.user;
    return await this.workspaceService.createWorkspace(
      createWorkspaceDto,
      user,
      Number(projectId),
    );
  }

  @Post(':workspaceId/invite')
  @UseGuards(JwtAuthGuard)
  async inviteToWorkspace(
    @Param('workspaceId') workspaceId: number,
    @Body() inviteUserDto: InviteUserDto,
    @Req() req,
  ) {
    const user = req.user;
    return await this.workspaceService.inviteUserToWorkspace(
      workspaceId,
      inviteUserDto,
      user,
    );
  }
}
