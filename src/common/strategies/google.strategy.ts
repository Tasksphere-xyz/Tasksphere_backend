/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import * as dotenv from 'dotenv';
import { AuthService } from 'src/modules/auth/auth.service';
dotenv.config();

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    cb: VerifyCallback,
  ): Promise<any> {
    const { name, emails, id } = profile;

    if (!emails || !emails.length || !name) {
      throw new Error('Invalid Google profile data');
    }

    const userDetails = {
      username: name.givenName,
      email: emails[0].value,
      googleId: id,
    };

    const { access_token, user } = await this.authService.googleAuthValidate(
      userDetails,
    );
    
    return cb(null, { access_token, user });
  }
}
