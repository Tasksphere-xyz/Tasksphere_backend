/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Handle JWT-specific errors
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Expired Token');
    } else if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Invalid token');
    }

    if (err || !user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return user; 
  }
}

