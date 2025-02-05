import { Controller, Body, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPayload } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('update')
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.userService.updateUserProfile(updateUserDto, user);
  }
}
