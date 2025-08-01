/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post, Req, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createResponse } from 'src/common/dto/response.dto';
import { GoogleAuthGuard } from 'src/common/guards/google-auth.guard';
import { LoginDto, SignupDto } from './dto/auth.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin(): Promise<{ url: string }> {
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URL}&response_type=code&scope=profile email`;

    return { url: googleOAuthUrl };
  }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleRedirect(@Request() req, @Res() res) {
    const { access_token, user } = req.user;

    res.cookie('jwt', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return res.status(200).json({
      status: true,
      message: 'Login successful',
      data: { user, access_token },
    });
  }

  @Post('signup')
  @ApiOperation({ summary: 'Sign up with email and password' })
  @ApiBody({ type: SignupDto })
  async signup(@Body() signupDto: SignupDto) {
    return await this.authService.signup(signupDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }
}
