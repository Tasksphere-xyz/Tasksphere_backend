import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { UserPayload } from 'express';
import { createResponse } from 'src/common/dto/response.dto';
import { UpdateUserDto } from './dto/update-user.dto';


@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  public async findUserByEmail(
    email: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateUserProfile(updateUserDto: UpdateUserDto, user: UserPayload) {
    const { username, displayPic } = updateUserDto;

    const foundUser = await this.findUserByEmail(user.email);

    // check this 3 lines to make sure nothing goes wrong if a part of dto is missing
    foundUser.username = username;
    foundUser.displayPic = displayPic;

    await this.userRepository.save(foundUser);

    return createResponse(true, 'User profile updated successfully', {});
  }
}
