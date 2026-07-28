import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  home(@Res() response: Response) {
    const panelUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001/login';
    return response.redirect(panelUrl);
  }
}
