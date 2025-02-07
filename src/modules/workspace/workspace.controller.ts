/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from '../project/dto/invite-user.dto';
import { UserPayload } from 'express';

@ApiTags('workspace')
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('create/:projectId')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Workspace created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create workspace' })
  @ApiParam({ name: 'projectId', description: 'id of the project' })
  async createProject(
    @Param('projectId') projectId: string,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Req() req: Request & { user: UserPayload },
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
  @ApiResponse({
    status: 200,
    description: 'User invited to workspace successfully',
  })
  @ApiResponse({ status: 400, description: 'Unauthorized access' })
  @ApiParam({ name: 'workspaceId', description: 'id of the workspace' })
  async inviteToWorkspace(
    @Param('workspaceId') workspaceId: number,
    @Body() inviteUserDto: InviteUserDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.workspaceService.inviteUserToWorkspace(
      workspaceId,
      inviteUserDto,
      user,
    );
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'List of workspaces retrieved successfully' })
  async getAllWorkspaces(@Req() req: Request & { user: UserPayload }) {
    const user = req.user;
    return await this.workspaceService.getAllUserWorkspaces(user);
  }

  @Post(':workspaceId/join')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'User successfully joined the workspace' })
  @ApiResponse({ status: 400, description: 'Invalid invitation or workspace does not exist' })
  @ApiParam({ name: 'workspaceId', description: 'ID of the workspace' })
  async joinWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.workspaceService.joinWorkspace(Number(workspaceId), user);
  }
}
