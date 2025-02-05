import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UserPayload } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from 'src/entities/project.entity';
import { Repository } from 'typeorm';
import { ProjectMembership } from 'src/entities/project-membership.entity';
import { createResponse } from 'src/common/dto/response.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMembership)
    private projectMembershipRepository: Repository<ProjectMembership>,
  ) {}

  async createProject(createProjectDto: CreateProjectDto, user: UserPayload) {
    const { project_name, description } = createProjectDto;
    const newProject = await this.projectRepository.save({
      project_name,
      description,
    });

    if (!newProject) {
      throw new BadRequestException('Failed to create project');
    }

    await this.projectMembershipRepository.save({
      project_id: newProject.id,
      email: user.email,
      status: 'accepted',
      role: 'owner',
    });

    return createResponse(true, 'Project created successfully', { newProject });
  }
}
