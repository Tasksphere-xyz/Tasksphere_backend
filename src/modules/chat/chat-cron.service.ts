import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WorkspaceMessage } from 'src/entities/workspace-message.entity';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class ChatCronService {
  constructor(
    @InjectRepository(WorkspaceMessage)
    private workspaceMessageRepository: Repository<WorkspaceMessage>,
  ) {}

  @Cron('0 * * * *')
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async unpinExpiredMessages() {
    try {
      const now = new Date();
      const expiredMessages = await this.workspaceMessageRepository.find({
        where: {
          isPinned: true,
          pinExpiresAt: LessThan(now),
        },
      });

      if (expiredMessages.length > 0) {
        for (const message of expiredMessages) {
          message.isPinned = false;
          message.pinExpiresAt = null;
          await this.workspaceMessageRepository.save(message);
        }

        console.log(
          `${expiredMessages.length} ${
            expiredMessages.length === 1 ? 'message' : 'messages'
          } unpinned.`,
        );
      } else {
        console.log('No expired messages to unpin');
      }
    } catch (err) {
      console.error('Error during message unpin:', err);
    }
  }
}
