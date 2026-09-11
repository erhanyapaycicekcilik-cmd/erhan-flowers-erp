import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribe(endpoint: string, p256dh: string, auth: string) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth },
      update: { p256dh, auth },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async sendToAll(payload: PushPayload) {
    const subs = await this.prisma.pushSubscription.findMany();
    if (subs.length === 0) return;

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@erhanflowers.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      this.logger.warn('VAPID anahtarlari tanimli degil, push notification gonderilemiyor.');
      return;
    }

    // web-push kütüphanesi
    let webpush: any;
    try {
      webpush = await import('web-push');
      webpush = webpush.default ?? webpush;
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch {
      this.logger.warn('web-push paketi yuklu degil.');
      return;
    }

    const notification = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      url: payload.url || '/',
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification,
        );
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // Abonelik artık geçerli değil, sil
          await this.prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => {});
        } else {
          this.logger.warn(`Push gonderilemedi: ${sub.endpoint.slice(0, 40)}... Hata: ${err?.message}`);
        }
      }
    }
  }
}
