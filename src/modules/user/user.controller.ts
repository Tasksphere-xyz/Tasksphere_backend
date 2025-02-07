/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Controller,
  Body,
  Patch,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get
} from '@nestjs/common';
import { ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPayload } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/utils/multer.util';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('update')
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'User not found' })
  @UseInterceptors(FileInterceptor('profileImg', multerConfig))
  async updateUserProfile(
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    let filePath: string = '';

    if (file) {
      filePath = file.path;
    }
    return await this.userService.updateUserProfile(
      updateUserDto,
      user,
      filePath,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getUserProfile(@Req() req: Request & { user: UserPayload }) {
    const user = req.user;
    return await this.userService.getUserProfile(user);
  }
}
