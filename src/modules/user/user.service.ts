import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { UserPayload } from 'express';
import { createResponse } from 'src/common/dto/response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as path from 'path';
import * as fs from 'fs';
import { CloudinaryProvider } from 'src/providers/cloudinary.provider';
import { unlinkSavedFile } from 'src/utils/unlinkImage.util';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly cloudinaryProvider: CloudinaryProvider,
  ) {}

  public async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateUserProfile(
    updateUserDto: UpdateUserDto,
    user: UserPayload,
    filePath: string,
  ) {
    const { username } = updateUserDto;
    const foundUser = await this.findUserByEmail(user.email);

    if (username) {
      foundUser.username = username;
    }

    if (filePath) {
      const imageToBeDeleted = foundUser.displayPic;

      const newFilename = `${Date.now()}_${foundUser.username}_dp${path.extname(
        filePath,
      )}`;
      const newFilePath = path.resolve(
        __dirname,
        `../../../uploads/${newFilename}`,
      );
      fs.renameSync(filePath, newFilePath);

      const response = await this.cloudinaryProvider.uploadImageToCloud(
        newFilePath,
      );

      foundUser.displayPic = response.secure_url;

      await this.userRepository.save(foundUser);

      if (imageToBeDeleted) {
        await this.cloudinaryProvider.deleteSingleImageFromCloud(
          imageToBeDeleted,
        );
      }

      unlinkSavedFile(newFilePath);
    }

    return createResponse(true, 'User profile updated successfully', {
      username: foundUser.username,
      displayPic: foundUser.displayPic,
    });
  }
}
