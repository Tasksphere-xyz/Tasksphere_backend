/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import { Request } from 'express';
import * as cookie from 'cookie';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: (req: Request) => {
        // Check for token in Authorization header
        const tokenFromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

        // Check for token in cookies
        const cookies = cookie.parse(req.headers.cookie || '');
        const tokenFromCookie = cookies.jwt;

        // Return the token if found in either location
        return tokenFromHeader || tokenFromCookie;
      },
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: UserPayload) {
    return payload;
  }
}
