import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULTS: Record<string, string> = {
  whatsapp: '905321234567',
  phone: '05321234567',
  address: 'Antalya, Türkiye',
  working_hours: 'Pazartesi-Cumartesi 09:00-18:00',
  banner_enabled: 'false',
  banner_text: '',
  banner_color: 'blue',
  payment_method: 'none',
  site_name: 'Erhan Flowers',
  instagram: '',
  facebook: '',
  google_analytics_id: '',
  google_tag_manager_id: '',
  google_site_verification: '',
};

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany();
    const result: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) result[row.key] = row.value;
    return result;
  }

  async set(key: string, value: string): Promise<void> {
    await this.prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async setBulk(data: Record<string, string>): Promise<void> {
    await Promise.all(Object.entries(data).map(([key, value]) => this.set(key, value)));
  }
}
