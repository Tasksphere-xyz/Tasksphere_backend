import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

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
      });
      await this.userRepository.save(user);
    }

    const payload = { email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user,
    };
  }
}
