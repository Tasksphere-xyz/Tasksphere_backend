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

  @Post('create/:contractId')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Workspace created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create workspace' })
  @ApiParam({ name: 'contractId', description: 'id of the contract' })
  async createWorkspace(
    @Param('contractId') contractId: string,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.workspaceService.createWorkspace(contractId, createWorkspaceDto, user);
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

  @Get(':contractId')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Workspace fetched successfully',
  })
  @ApiResponse({ status: 400, description: 'Workspace not found' })
  @ApiParam({ name: 'contractId', description: 'contractId of the workspace' })
  async getWorkspace(
    @Param('contractId') contractId: string
  ) {
    return this.workspaceService.getWorkspaceDetails(contractId);
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

  @Post(':workspaceId/delete')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Workspace deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Only workspace owner can delete' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @ApiParam({ name: 'workspaceId', description: 'ID of the workspace to delete' })
  async deleteWorkspace(
    @Param('workspaceId') workspaceId: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.workspaceService.deleteWorkspace(workspaceId, user);
  }
}
