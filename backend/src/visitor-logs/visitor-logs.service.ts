import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class VisitorLogsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { site: string; path: string; ipAddress: string; userAgent?: string }) {
    let deviceBrand: string | null = null;
    let deviceType: string | null = null;
    let browser: string | null = null;

    if (data.userAgent) {
      const ua = new UAParser(data.userAgent);
      const result = ua.getResult();
      deviceBrand = result.device?.vendor ?? null;
      const dtype = result.device?.type;
      deviceType = dtype ?? (result.os?.name?.toLowerCase().includes('android') || result.os?.name?.toLowerCase().includes('ios') ? 'mobile' : 'desktop');
      browser = result.browser?.name ?? null;
    }

    const ip = (data.ipAddress ?? '').split(',')[0].trim();

    await this.prisma.pageView.create({
      data: {
        site: data.site,
        path: data.path,
        ipAddress: ip,
        userAgent: data.userAgent ?? null,
        deviceBrand,
        deviceType,
        browser,
      },
    });
  }

  async list(query: { site?: string; limit?: number; offset?: number }) {
    const where = query.site ? { site: query.site } : {};
    const [items, total] = await Promise.all([
      this.prisma.pageView.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 100,
        skip: query.offset ?? 0,
        select: {
          id: true,
          site: true,
          path: true,
          ipAddress: true,
          deviceBrand: true,
          deviceType: true,
          browser: true,
          createdAt: true,
        },
      }),
      this.prisma.pageView.count({ where }),
    ]);
    return { items, total };
  }
}
