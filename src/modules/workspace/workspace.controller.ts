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
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceService } from './workspace.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UserPayload } from 'express';

@ApiTags('workspace') 
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Workspace created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create workspace' })
  async createWorkspace(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.workspaceService.createWorkspace(createWorkspaceDto, user);
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

  @Get(':workspaceId/members')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Workspace members fetched successfully',
  })
  @ApiResponse({ status: 400, description: 'Workspace not found' })
  @ApiParam({ name: 'workspaceId', description: 'id of the workspace' })
  @ApiQuery({
    name: 'page',
    required: true,
    description: 'Page number for pagination',
  })
  async getWorkspaceMembers(
    @Param('workspaceId') workspaceId: number,
    @Req() req: Request & { user: UserPayload },
    @Query('page') page: number,
  ) {
    const user = req.user;
    return this.workspaceService.getWorkspaceMembers(workspaceId, user, page);
  }

  @Post(':workspaceId/join')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'User successfully joined the workspace',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid invitation or workspace does not exist',
  })
  @ApiParam({ name: 'workspaceId', description: 'ID of the workspace' })
  async joinWorkspace(
    @Param('workspaceId') workspaceId: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.workspaceService.joinWorkspace(workspaceId, user);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'List of workspaces retrieved successfully' })
  async getAllWorkspaces(@Req() req: Request & { user: UserPayload }) {
    const user = req.user;
    return await this.workspaceService.getAllUserWorkspaces(user);
  }
}
