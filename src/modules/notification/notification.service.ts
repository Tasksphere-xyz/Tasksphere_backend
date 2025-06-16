/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { EmailService } from '../../common/email/email.service';
import {
  Notification,
  NotificationType,
} from 'src/entities/notification.entity';
import { createResponse } from 'src/common/dto/response.dto';
import { UserPayload } from 'express';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private readonly emailService: EmailService,
  ) {}

  public async sendNotification(
    sendTo: string[],
    type: NotificationType,
    title: string,
    message: string,
  ) {
    const notification = this.notificationRepository.create({
      sendTo,
      type,
      title,
      message,
    });

    await this.notificationRepository.save(notification);

    // Send Email Notification
    for (const email of sendTo) {
      await this.emailService.sendEmail(email, title, message);
    }
  }

  async getUserNotifications(page: number = 1, user: UserPayload) {
    page = page > 0 ? page : 1;
    const limit = 6;

    const skip = (page - 1) * limit;
    const { email } = user;

    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { sendTo: Like(`%${email}%`) },
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

    await this.notificationRepository.update(
      { sendTo: Like(`%${email}%`), isRead: false },
      { isRead: true },
    );

    const totalPages = Math.ceil(total / limit);

    const message =
      notifications.length === 0
        ? 'no notifications found'
        : 'notifications retrieved successfully';

    return createResponse(true, message, {
      notifications,
      totalPages: totalPages === 0 ? 1 : totalPages,
      currentPage: page,
    });
  }
}
