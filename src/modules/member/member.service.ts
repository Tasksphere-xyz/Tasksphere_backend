import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UpdateMemberDto } from './dto/update-member.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { UserPayload } from 'express';
import { createResponse } from 'src/common/dto/response.dto';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  public async findUserByEmail(
    email: string,
    filePath?: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateUserProfile(updateMemberDto: UpdateMemberDto, user: UserPayload) {
    const { username, displayPic, role } = updateMemberDto;

    const foundUser = await this.findUserByEmail(user.email);

    // check this 3 lines to make sure nothing goes wrong if a part of dto is missing
    foundUser.username = username;
    foundUser.displayPic = displayPic;
    foundUser.role = role;

    await this.userRepository.save(foundUser);

    return createResponse(true, 'User profile updated successfully', {});
  }
}
