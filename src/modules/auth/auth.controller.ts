import { Controller, Get, Req, Request, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { request } from "express";
import { GoogleAuthGuard } from "src/common/guards/google-auth.guard";

@ApiTags('auth')
@Controller('auth')
export class AuthController {
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
}