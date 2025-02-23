import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UserPayload } from 'express';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('/')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'User not found' })
  @ApiQuery({
    name: 'page',
    required: true,
    description: 'Page number for pagination',
  })
  async getUserNotifications(
    @Query('page') page: number,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return this.notificationService.getUserNotifications(page, user);
  }
}
