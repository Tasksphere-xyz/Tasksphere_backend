/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from 'src/entities/task.entity';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/entities/notification.entity';
import { UserService } from '../user/user.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { Workspace } from 'src/entities/workspace.entity';

@Injectable()
export class TaskCronService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyTaskDeadlines() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tasksDueTomorrow = await this.taskRepository.find({
        where: { due_date: tomorrow },
        relations: ['workspace'],
      });

      if (tasksDueTomorrow.length > 0) {
        for (const task of tasksDueTomorrow) {
          const assignedTo = task.assigned_to;
          const workspaceName = task.workspace ? task.workspace.workspace_name : 'unknown workspace';

          // Notify all assigned users
          if (assignedTo && assignedTo.length > 0) {
            // Fetch all assigned users
            const assignedUsersPromises = assignedTo.map(userId =>
              this.userService.findUserById(userId)
            );
            const assignedUsers = await Promise.all(assignedUsersPromises);

            // Filter out null values (in case user was deleted)
            const validAssignedUsers = assignedUsers.filter(user => user !== null);

            if (validAssignedUsers.length > 0) {
              const emails = validAssignedUsers.map(user => user.email);
              
              await this.notificationService.sendNotification(
                emails,
                NotificationType.TASK_DEADLINE,
                'Task Deadline Approaching',
                `Task '${task.title}' in workspace '${workspaceName}' is due tomorrow.`,
              );
            }
          }
        }

        console.log(
          `${tasksDueTomorrow.length} ${
            tasksDueTomorrow.length === 1 ? 'task' : 'tasks'
          } due tomorrow`,
        );
      } else {
        console.log('No tasks due tomorrow');
      }
    } catch (err) {
      console.error('Error during task deadline notification:', err);
    }
  }
}