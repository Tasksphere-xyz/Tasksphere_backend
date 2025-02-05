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
import { EmailService } from 'src/common/email/email.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMembership)
    private projectMembershipRepository: Repository<ProjectMembership>,
    private emailService: EmailService,
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
      throw new ForbiddenException('Not authorized to invite users');
    }

    // check if user is already part of the project
    const { emails } = inviteUserDto;
    const existingMembers: string[] = [];
    const invitedMembers: string[] = [];

    for (const email of emails) {
      // Check if user is already part of the project
      const existingMembership = await this.projectMembershipRepository.findOne(
        {
          where: { project_id, email },
        },
      );
      if (existingMembership) {
        existingMembers.push(email);
        continue;
      }

      // Send the invitation email
      await this.emailService.sendEmail(
        email,
        'Invitation to join Project',
        `${inviter.email} has invited you to join this project. Click <a href="#">here</a> to accept the invitation.`,
      );

      invitedMembers.push(email);
    }

    const message = `${invitedMembers.length} ${
      invitedMembers.length > 1 ? 'Users' : 'User'
    } invited to project successfully`;

    return createResponse(true, message, {
      existingMembers,
      invitedMembers,
    });
  }
}
