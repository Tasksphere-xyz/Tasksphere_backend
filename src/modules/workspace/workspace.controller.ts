import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

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
}
