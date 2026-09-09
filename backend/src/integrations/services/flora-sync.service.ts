import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationsService } from '../integrations.service';

// FLORA (Florayapaycicek) siparişlerini otomatik olarak retail_sales tablosuna çeker.
// Her 15 dakikada bir Trendyol ve N11'deki FLORA siparişlerini senkronize eder.
@Injectable()
export class FloraSyncService {
  private readonly logger = new Logger(FloraSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  @Cron('2,17,32,47 * * * *') // ERHAN cron'undan 2 dk sonra (*/15 = 0,15,30,45)
  async cronSyncFloraOrders() {
    try {
      const owner = await this.prisma.user.findFirst({ where: { role: 'OWNER' } });
      if (!owner) return;

      // FLORA Trendyol siparişleri → retail_sales
      try {
        const r1 = await this.integrations.syncOrders('TRENDYOL', owner.id, 'FLORA');
        if (r1.imported > 0) this.logger.log(`FLORA Trendyol: ${r1.imported} yeni sipariş kaydedildi.`);
      } catch (err) {
        this.logger.warn(`FLORA Trendyol sync hatası: ${String(err)}`);
      }

      // FLORA N11 siparişleri → retail_sales
      try {
        const r2 = await this.integrations.syncOrders('N11', owner.id, 'FLORA');
        if (r2.imported > 0) this.logger.log(`FLORA N11: ${r2.imported} yeni sipariş kaydedildi.`);
      } catch (err) {
        this.logger.warn(`FLORA N11 sync hatası: ${String(err)}`);
      }
    } catch (err) {
      this.logger.warn(`FLORA cron genel hata: ${String(err)}`);
    }
  }

  async syncNow(): Promise<{ trendyol: unknown; n11: unknown }> {
    const owner = await this.prisma.user.findFirst({ where: { role: 'OWNER' } });
    if (!owner) throw new Error('Sistem sahibi bulunamadı.');
    const [trendyol, n11] = await Promise.allSettled([
      this.integrations.syncOrders('TRENDYOL', owner.id, 'FLORA'),
      this.integrations.syncOrders('N11', owner.id, 'FLORA'),
    ]);
    return {
      trendyol: trendyol.status === 'fulfilled' ? trendyol.value : { ok: false, message: String((trendyol as PromiseRejectedResult).reason) },
      n11: n11.status === 'fulfilled' ? n11.value : { ok: false, message: String((n11 as PromiseRejectedResult).reason) },
    };
  }
}
