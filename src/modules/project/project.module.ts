import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from 'src/entities/project.entity';
import { ProjectMembership } from 'src/entities/project-membership.entity';
import { EmailService } from 'src/common/email/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMembership]),
  ],
  controllers: [ProjectController],
  providers: [ProjectService, EmailService],
})
export class ProjectModule {}
