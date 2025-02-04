import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { UserPayload } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async googleAuthValidate(GoogleAuthDto: GoogleAuthDto) {
    let user = await this.userRepository.findOne({
      where: { email: GoogleAuthDto.email },
    });

    if (!user) {
      const user = this.userRepository.create({
        ...GoogleAuthDto,
        role: 'member',
      });
      await this.userRepository.save(user);
    }

    const payload: UserPayload = { email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user,
    };
  }
}
