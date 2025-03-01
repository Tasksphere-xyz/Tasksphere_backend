import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from 'src/entities/task.entity';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/entities/notification.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class TaskCronService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyTaskDeadlines() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasksDueTomorrow = await this.taskRepository.find({
        where: { due_date: tomorrow },
      });

      if (tasksDueTomorrow.length > 0) {
        for (const task of tasksDueTomorrow) {
          const assignedTo = task.assigned_to;
          if (assignedTo) {
            const assignedUser = await this.userService.findUserById(
              assignedTo,
            );

            await this.notificationService.sendNotification(
              [assignedUser.email],
              NotificationType.TASK_DEADLINE,
              'Task Deadline Approaching',
              `Submit the '${task.title}' by tomorrow.`,
            );
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
