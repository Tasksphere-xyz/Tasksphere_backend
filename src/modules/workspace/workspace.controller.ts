import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from '../project/dto/invite-user.dto';

@ApiTags('workspace')
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('create/:projectId')
  @ApiResponse({ status: 200, description: 'Workspace created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create workspace' })
  @ApiParam({ name: 'projectId', description: 'id of the project' })
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
  @ApiResponse({ status: 200, description: 'User invited to workspace successfully' })
  @ApiResponse({ status: 400, description: 'Unauthorized access' })
  @ApiParam({ name: 'workspaceId', description: 'id of the workspace' })
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
