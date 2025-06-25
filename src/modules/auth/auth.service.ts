/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { createResponse } from 'src/common/dto/response.dto';
import { LoginDto, SignupDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';

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

    const payload = { email: user.email};
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user,
    };
  }

  async signup(signupDto: SignupDto) {
    const { email, username, password } = signupDto;
  
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }
  
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({ email, username, password: hashedPassword });
    await this.userRepository.save(user);
  
    const token = this.jwtService.sign({ email: user.email });
  
    return createResponse(true, 'Sign up successful', { access_token: token, user });
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({ where: { email } });
  
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const token = this.jwtService.sign({ email: user.email });

    return createResponse(true, 'Sign in successful', { access_token: token, user });
  }
}
