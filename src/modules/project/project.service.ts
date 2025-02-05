import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UserPayload } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from 'src/entities/project.entity';
import { Repository } from 'typeorm';
import { ProjectMembership } from 'src/entities/project-membership.entity';
import { createResponse } from 'src/common/dto/response.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { User } from 'src/entities/user.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMembership)
    private projectMembershipRepository: Repository<ProjectMembership>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  async inviteUserToProject(
    project_id: number,
    inviteUserDto: InviteUserDto,
    user: UserPayload,
  ) {
    // check the eligibility of the inviter
    const inviter = await this.projectMembershipRepository.findOne({
      where: { project_id, email: user.email, status: 'accepted' },
    });
    if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
      throw new ForbiddenException('Unauthorized access.');
    }

    // check if user is already part of the project
    const { email } = inviteUserDto;
    const existingMembership = await this.projectMembershipRepository.findOne({
      where: { project_id, email },
    });
    if (existingMembership) {
      throw new BadRequestException('User is already a member of the project.');
    }

    // Find invitee by email
    const foundUser = await this.userRepository.findOne({ where: { email } });
    if (!foundUser) {
      throw new NotFoundException('User not found');
    }

    // Add user to project_membership as pending
    const inviteInfo = await this.projectMembershipRepository.save({
      project_id,
      email,
      role: 'member',
      status: 'pending',
    });

    return createResponse(true, 'User invited to project successfully', { inviteInfo });
  }
}
