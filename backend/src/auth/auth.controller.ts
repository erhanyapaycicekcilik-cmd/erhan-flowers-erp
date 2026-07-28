import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email: string; password: string; rememberMe?: boolean },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body.email, body.password, Boolean(body.rememberMe));
    response.cookie('auth_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: body.rememberMe ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8,
    });
    return { token: result.token, user: result.user };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() request: Request & { user?: unknown }) {
    return request.user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('auth_token');
    return { ok: true };
  }
}
