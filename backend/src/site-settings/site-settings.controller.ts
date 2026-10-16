import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SiteSettingsService } from './site-settings.service';

@Controller('site-settings')
@UseGuards(AuthGuard)
export class SiteSettingsController {
  constructor(private readonly service: SiteSettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Put()
  setBulk(@Body() data: Record<string, string>) {
    return this.service.setBulk(data).then(() => ({ ok: true }));
  }
}
