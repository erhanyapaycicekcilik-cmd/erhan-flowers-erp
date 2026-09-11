import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationCenterService } from '../integrations/services/integration-center.service';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class CustomerQuestionsService {
  private readonly logger = new Logger(CustomerQuestionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationCenter: IntegrationCenterService,
    private readonly push: PushNotificationService,
  ) {}

  async list(params: { status?: string; platform?: string; page?: number; limit?: number }) {
    const { status, platform, page = 1, limit = 50 } = params;
    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (platform) where.platform = platform.toUpperCase();

    const [total, items] = await Promise.all([
      this.prisma.customerQuestion.count({ where }),
      this.prisma.customerQuestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { total, page, limit, items };
  }

  async answer(id: number, answer: string, companyCode = 'ERHAN') {
    const question = await this.prisma.customerQuestion.findUniqueOrThrow({ where: { id } });
    await this.sendAnswerToPlatform(question.platform, question.externalId, answer, companyCode);
    return this.prisma.customerQuestion.update({
      where: { id },
      data: { answer, status: 'ANSWERED', answeredAt: new Date() },
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncAll() {
    await Promise.allSettled([
      this.syncTrendyol(),
      this.syncN11(),
      this.syncHepsiburada(),
      this.checkNewOrders(),
    ]);
  }

  private lastOrderCount: number | null = null;

  async checkNewOrders() {
    try {
      const count = await this.prisma.marketplaceOrder.count({
        where: { createdAt: { gte: new Date(Date.now() - 6 * 60 * 1000) } },
      });
      if (this.lastOrderCount !== null && count > 0) {
        await this.push.sendToAll({
          title: `${count} Yeni Sipariş Aldınız!`,
          body: 'Siparişlerinizi görüntülemek için tıklayın',
          url: '/orders',
        });
      }
      this.lastOrderCount = count;
    } catch { /* sessizce geç */ }
  }

  async syncTrendyol(companyCode = 'ERHAN') {
    try {
      const creds = await this.integrationCenter.runtimeCredentials('TRENDYOL', companyCode);
      const supplierId = creds.SUPPLIER_ID;
      const apiUrl = (creds.API_URL || 'https://api.trendyol.com/sapigw').replace(/\/+$/, '');
      if (!supplierId || !creds.API_KEY || !creds.API_SECRET) return;

      const auth = Buffer.from(`${creds.API_KEY}:${creds.API_SECRET}`).toString('base64');
      const headers = {
        Authorization: `Basic ${auth}`,
        'User-Agent': `${supplierId} - SelfIntegration`,
        'Content-Type': 'application/json',
      };

      const url = `${apiUrl}/suppliers/${supplierId}/questions?status=WAITING_FOR_ACTION&size=200&page=0`;
      const res = await fetch(url, { headers });
      if (!res.ok) { this.logger.warn(`Trendyol soru cekme hatasi: ${res.status}`); return; }

      const body = await res.json().catch(() => ({})) as Record<string, any>;
      const items: any[] = Array.isArray(body.content) ? body.content : [];
      let newCount = 0;

      for (const item of items) {
        const externalId = String(item.id ?? item.questionId ?? '');
        if (!externalId) continue;
        const result = await this.prisma.customerQuestion.upsert({
          where: { platform_externalId: { platform: 'TRENDYOL', externalId } },
          create: {
            platform: 'TRENDYOL',
            externalId,
            productName: String(item.productName ?? item.content?.productName ?? ''),
            productSku: String(item.merchantSku ?? ''),
            customerName: String(item.customerFirstName ?? item.customerName ?? 'Müşteri'),
            question: String(item.text ?? item.questionText ?? ''),
            status: 'PENDING',
            askedAt: item.creationDate ? new Date(item.creationDate) : null,
            rawPayload: item,
          },
          update: {},
        });
        if (result.createdAt > new Date(Date.now() - 6 * 60 * 1000)) newCount++;
      }

      if (newCount > 0) {
        await this.push.sendToAll({
          title: 'Yeni Müşteri Sorusu',
          body: `Trendyol'dan ${newCount} yeni soru geldi`,
          url: '/musteri-sorulari',
        });
      }
    } catch (err) {
      this.logger.error('Trendyol soru sync hatasi', err);
    }
  }

  async syncN11(companyCode = 'ERHAN') {
    try {
      const creds = await this.integrationCenter.runtimeCredentials('N11', companyCode);
      const apiKey = creds.API_KEY;
      const apiSecret = creds.API_SECRET;
      if (!apiKey || !apiSecret) return;

      const apiUrl = (creds.API_URL || 'https://api.n11.com').replace(/\/+$/, '');
      const url = `${apiUrl}/ws/ProductQuestionService/GetProductQuestions`;

      const soap = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:GetProductQuestionsRequest>
      <auth><appKey>${apiKey}</appKey><appSecret>${apiSecret}</appSecret></auth>
      <pagingData><currentPage>0</currentPage><pageSize>50</pageSize></pagingData>
    </sch:GetProductQuestionsRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: '' },
        body: soap,
      });
      if (!res.ok) { this.logger.warn(`N11 soru cekme hatasi: ${res.status}`); return; }

      const text = await res.text();
      const matches = text.match(/<question>([\s\S]*?)<\/question>/g) ?? [];
      let newCount = 0;

      for (const match of matches) {
        const get = (tag: string) => match.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`))?.[1] ?? '';
        const externalId = get('id');
        if (!externalId) continue;
        const status = get('status');
        if (status === 'answered') continue;
        const result = await this.prisma.customerQuestion.upsert({
          where: { platform_externalId: { platform: 'N11', externalId } },
          create: {
            platform: 'N11',
            externalId,
            productName: get('productName'),
            customerName: get('userNickName') || 'Müşteri',
            question: get('questionText'),
            status: 'PENDING',
            rawPayload: { xml: match },
          },
          update: {},
        });
        if (result.createdAt > new Date(Date.now() - 6 * 60 * 1000)) newCount++;
      }

      if (newCount > 0) {
        await this.push.sendToAll({
          title: 'Yeni Müşteri Sorusu',
          body: `N11'den ${newCount} yeni soru geldi`,
          url: '/musteri-sorulari',
        });
      }
    } catch (err) {
      this.logger.error('N11 soru sync hatasi', err);
    }
  }

  async syncHepsiburada(companyCode = 'ERHAN') {
    try {
      const creds = await this.integrationCenter.runtimeCredentials('HEPSIBURADA', companyCode);
      const merchantId = creds.MERCHANT_ID;
      const apiKey = creds.API_KEY;
      const apiSecret = creds.API_SECRET || creds.PASSWORD;
      if (!merchantId || !apiKey || !apiSecret) return;

      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      const apiUrl = 'https://mpop.hepsiburada.com';
      const url = `${apiUrl}/product/api/questions/list?merchantId=${merchantId}&page=1&size=50&status=OPEN`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          'User-Agent': creds.USER_AGENT || `ErhanFlowersERP-HB`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) { this.logger.warn(`HB soru cekme hatasi: ${res.status}`); return; }

      const body = await res.json().catch(() => ({})) as Record<string, any>;
      const items: any[] = Array.isArray(body.data) ? body.data : [];
      let newCount = 0;

      for (const item of items) {
        const externalId = String(item.id ?? item.questionId ?? '');
        if (!externalId) continue;
        const result = await this.prisma.customerQuestion.upsert({
          where: { platform_externalId: { platform: 'HEPSIBURADA', externalId } },
          create: {
            platform: 'HEPSIBURADA',
            externalId,
            productName: String(item.productName ?? ''),
            productSku: String(item.sku ?? ''),
            customerName: String(item.memberNickname ?? 'Müşteri'),
            question: String(item.text ?? item.question ?? ''),
            status: 'PENDING',
            askedAt: item.createdAt ? new Date(item.createdAt) : null,
            rawPayload: item,
          },
          update: {},
        });
        if (result.createdAt > new Date(Date.now() - 6 * 60 * 1000)) newCount++;
      }

      if (newCount > 0) {
        await this.push.sendToAll({
          title: 'Yeni Müşteri Sorusu',
          body: `Hepsiburada'dan ${newCount} yeni soru geldi`,
          url: '/musteri-sorulari',
        });
      }
    } catch (err) {
      this.logger.error('HB soru sync hatasi', err);
    }
  }

  private async sendAnswerToPlatform(platform: string, externalId: string, answer: string, companyCode: string) {
    const creds = await this.integrationCenter.runtimeCredentials(platform, companyCode);

    if (platform === 'TRENDYOL') {
      const supplierId = creds.SUPPLIER_ID;
      const apiUrl = (creds.API_URL || 'https://api.trendyol.com/sapigw').replace(/\/+$/, '');
      const auth = Buffer.from(`${creds.API_KEY}:${creds.API_SECRET}`).toString('base64');
      await fetch(`${apiUrl}/suppliers/${supplierId}/questions/${externalId}/answers`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'User-Agent': `${supplierId} - SelfIntegration` },
        body: JSON.stringify({ text: answer }),
      });
    } else if (platform === 'N11') {
      const apiKey = creds.API_KEY;
      const apiSecret = creds.API_SECRET;
      const apiUrl = (creds.API_URL || 'https://api.n11.com').replace(/\/+$/, '');
      const soap = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:AnswerAProductQuestionRequest>
      <auth><appKey>${apiKey}</appKey><appSecret>${apiSecret}</appSecret></auth>
      <questionId>${externalId}</questionId>
      <answerText>${answer}</answerText>
    </sch:AnswerAProductQuestionRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
      await fetch(`${apiUrl}/ws/ProductQuestionService/AnswerAProductQuestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: '' },
        body: soap,
      });
    } else if (platform === 'HEPSIBURADA') {
      const merchantId = creds.MERCHANT_ID;
      const auth = Buffer.from(`${creds.API_KEY}:${creds.API_SECRET || creds.PASSWORD}`).toString('base64');
      await fetch(`https://mpop.hepsiburada.com/product/api/questions/${externalId}/answer`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'User-Agent': creds.USER_AGENT || 'ErhanFlowersERP-HB' },
        body: JSON.stringify({ merchantId, answer }),
      });
    }
  }
}
