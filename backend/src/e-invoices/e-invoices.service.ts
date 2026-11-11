import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Cron } from '@nestjs/schedule';
import { Prisma, RetailSaleChannel, RetailSaleStatus, WebOrderStatus } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { EInvoiceDraft, EInvoiceSettings } from './providers/e-invoice-provider.interface';
import { TrendyolEFaturamProvider } from './providers/trendyol-efaturam.provider';

type SourceType = 'RETAIL_SALE' | 'WEB_ORDER';
type SourceRef = { sourceType: SourceType; sourceId: number };

export type PendingInvoiceRow = {
  sourceType: SourceType;
  sourceId: number;
  sourceNumber: string;
  channel: string;
  customerName: string;
  amount: number;
  invoiceType: 'E_ARSIV' | 'E_FATURA';
  date: Date;
  lastError: string | null;
  attempts: number;
};

const SETTINGS_KEY = 'einvoice_settings';
/** Test ortamında kesilen faturalar ayrı etiketlenir; gerçek satışı "faturalandı" yapmaz */
const providerTag = (s: EInvoiceSettings) => (s.environment === 'PROD' ? 'TRENDYOL_EFATURAM' : 'TRENDYOL_EFATURAM_TEST');
const STALE_PENDING_MS = 5 * 60 * 1000;
const PASSWORD_MASK = '••••••••';

/** Pazaryeri siparişlerinin faturası pazaryeri tarafında kesilir; burada sadece dükkan/web kanalları */
const OWN_CHANNELS: RetailSaleChannel[] = ['STORE', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'OTHER'];

const DEFAULT_SETTINGS: EInvoiceSettings = {
  provider: 'TRENDYOL_EFATURAM',
  active: false,
  environment: 'STAGE',
  email: '',
  password: '',
  firmId: '',
  userId: '',
  eArchiveSeries: 'TRD',
  eInvoiceSeries: 'TRD',
  autoIssue: false,
  issueOn: 'DELIVERED',
  vatRate: 20,
  webSiteUrl: 'https://www.erhanflowers.com',
  carrierName: '',
  carrierTaxId: '',
  defaultCity: '',
  defaultDistrict: '',
  defaultAddress: '',
};

@Injectable()
export class EInvoicesService {
  private readonly logger = new Logger(EInvoicesService.name);
  private autoRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: TrendyolEFaturamProvider,
  ) {}

  // ─── Ayarlar ────────────────────────────────────────────────────────────

  private async loadSettings(): Promise<EInvoiceSettings> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return { ...DEFAULT_SETTINGS };
    try {
      const stored = JSON.parse(row.value) as Partial<EInvoiceSettings> & Record<string, unknown>;
      const merged = { ...DEFAULT_SETTINGS, ...stored } as EInvoiceSettings & Record<string, unknown>;
      delete merged.firmCode;
      delete merged.username;
      return merged;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async getSettings() {
    const settings = await this.loadSettings();
    return {
      settings: { ...settings, password: settings.password ? PASSWORD_MASK : '' },
      providerReady: this.provider.ready,
      providerNotice: this.provider.ready ? null : this.provider.notReadyReason ?? null,
    };
  }

  async saveSettings(body: Partial<EInvoiceSettings>) {
    const current = await this.loadSettings();
    const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v.trim() : fallback);
    const next: EInvoiceSettings = {
      ...current,
      active: typeof body.active === 'boolean' ? body.active : current.active,
      environment: body.environment === 'PROD' || body.environment === 'STAGE' ? body.environment : current.environment,
      password:
        typeof body.password === 'string' && body.password !== PASSWORD_MASK ? body.password.trim() : current.password,
      email: str(body.email, current.email).toLowerCase(),
      firmId: str(body.firmId, current.firmId),
      userId: str(body.userId, current.userId),
      webSiteUrl: str(body.webSiteUrl, current.webSiteUrl),
      carrierName: str(body.carrierName, current.carrierName),
      carrierTaxId: str(body.carrierTaxId, current.carrierTaxId).replace(/\D/g, ''),
      defaultCity: str(body.defaultCity, current.defaultCity),
      defaultDistrict: str(body.defaultDistrict, current.defaultDistrict),
      defaultAddress: str(body.defaultAddress, current.defaultAddress),
      eArchiveSeries: str(body.eArchiveSeries, current.eArchiveSeries).toUpperCase(),
      eInvoiceSeries: str(body.eInvoiceSeries, current.eInvoiceSeries).toUpperCase(),
      autoIssue: typeof body.autoIssue === 'boolean' ? body.autoIssue : current.autoIssue,
      issueOn: body.issueOn === 'SHIPPED' || body.issueOn === 'DELIVERED' ? body.issueOn : current.issueOn,
      vatRate: body.vatRate !== undefined && Number.isFinite(Number(body.vatRate)) ? Number(body.vatRate) : current.vatRate,
    };
    for (const series of [next.eArchiveSeries, next.eInvoiceSeries]) {
      if (series && !/^[A-Z0-9]{3}$/.test(series)) {
        throw new BadRequestException('Fatura serisi 3 karakter olmalı (harf/rakam), örn. TRD.');
      }
    }
    await this.prisma.appSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: JSON.stringify(next) },
      create: { key: SETTINGS_KEY, value: JSON.stringify(next) },
    });
    return this.getSettings();
  }

  async testConnection() {
    return this.provider.testConnection(await this.loadSettings());
  }

  // ─── Faturasız satışlar ─────────────────────────────────────────────────

  private retailStatuses(issueOn: EInvoiceSettings['issueOn']): RetailSaleStatus[] {
    return issueOn === 'SHIPPED' ? ['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'] : ['DELIVERED', 'COMPLETED'];
  }

  private webStatuses(issueOn: EInvoiceSettings['issueOn']): WebOrderStatus[] {
    return issueOn === 'SHIPPED' ? ['SHIPPED', 'DELIVERED'] : ['DELIVERED'];
  }

  async listPending(daysParam?: string | number): Promise<{ days: number; rows: PendingInvoiceRow[] }> {
    const days = Math.min(Math.max(Number(daysParam) || 90, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const settings = await this.loadSettings();

    const [sales, webOrders, existing] = await Promise.all([
      this.prisma.retailSale.findMany({
        where: {
          channel: { in: OWN_CHANNELS },
          status: { in: this.retailStatuses(settings.issueOn) },
          invoiceStatus: 'WAITING',
          grandTotal: { gt: 0 },
          OR: [{ completedAt: { gte: since } }, { completedAt: null, createdAt: { gte: since } }],
        },
        select: {
          id: true, saleNumber: true, channel: true, grandTotal: true, completedAt: true, createdAt: true,
          customer: { select: { displayName: true, companyTitle: true, isEInvoicePayer: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.webOrder.findMany({
        where: { status: { in: this.webStatuses(settings.issueOn) }, createdAt: { gte: since }, grandTotal: { gt: 0 } },
        select: { id: true, orderNumber: true, grandTotal: true, createdAt: true, customerName: true, companyTitle: true, invoiceCorporate: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.eInvoice.findMany({
        where: { sourceType: { in: ['RETAIL_SALE', 'WEB_ORDER'] } },
        select: { sourceType: true, sourceId: true, status: true, errorMessage: true, attempts: true, provider: true },
      }),
    ]);

    // Sadece aktif ortamda (test/canlı) kesilmiş kayıtlar satışı "faturalı" sayar
    const tag = providerTag(settings);
    const byKey = new Map(existing.filter((e) => e.provider === tag).map((e) => [`${e.sourceType}:${e.sourceId}`, e]));
    // "Faturalama" ile hariç tutulanlar her iki ortamda da listelenmez
    const skipped = new Set(existing.filter((e) => e.status === 'SKIPPED').map((e) => `${e.sourceType}:${e.sourceId}`));
    const rows: PendingInvoiceRow[] = [];

    for (const s of sales) {
      if (skipped.has(`RETAIL_SALE:${s.id}`)) continue;
      const inv = byKey.get(`RETAIL_SALE:${s.id}`);
      if (inv && inv.status !== 'ERROR') continue;
      rows.push({
        sourceType: 'RETAIL_SALE',
        sourceId: s.id,
        sourceNumber: s.saleNumber,
        channel: s.channel,
        customerName: s.customer.companyTitle || s.customer.displayName,
        amount: Number(s.grandTotal),
        invoiceType: s.customer.isEInvoicePayer ? 'E_FATURA' : 'E_ARSIV',
        date: s.completedAt ?? s.createdAt,
        lastError: inv?.errorMessage ?? null,
        attempts: inv?.attempts ?? 0,
      });
    }
    for (const w of webOrders) {
      if (skipped.has(`WEB_ORDER:${w.id}`)) continue;
      const inv = byKey.get(`WEB_ORDER:${w.id}`);
      if (inv && inv.status !== 'ERROR') continue;
      rows.push({
        sourceType: 'WEB_ORDER',
        sourceId: w.id,
        sourceNumber: w.orderNumber,
        channel: 'WEB',
        customerName: (w.invoiceCorporate && w.companyTitle) || w.customerName,
        amount: Number(w.grandTotal),
        invoiceType: 'E_ARSIV',
        date: w.createdAt,
        lastError: inv?.errorMessage ?? null,
        attempts: inv?.attempts ?? 0,
      });
    }
    rows.sort((a, b) => b.date.getTime() - a.date.getTime());
    return { days, rows };
  }

  // ─── Kesilen faturalar ──────────────────────────────────────────────────

  async listInvoices(query: { status?: string; limit?: string }) {
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
    const where: Prisma.EInvoiceWhereInput = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.eInvoice.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
      this.prisma.eInvoice.count({ where }),
    ]);
    return { total, rows: rows.map((r) => ({ ...r, amount: Number(r.amount) })) };
  }

  // ─── Fatura taslağı ─────────────────────────────────────────────────────

  async buildDraft(ref: SourceRef, settings?: EInvoiceSettings): Promise<EInvoiceDraft> {
    const s = settings ?? (await this.loadSettings());
    const vat = s.vatRate;
    const round = (n: number) => Math.round(n * 100) / 100;

    if (ref.sourceType === 'RETAIL_SALE') {
      const sale = await this.prisma.retailSale.findUnique({
        where: { id: ref.sourceId },
        include: {
          customer: true,
          address: true,
          items: { select: { productNameSnapshot: true, quantity: true, lineTotal: true } },
        },
      });
      if (!sale) throw new NotFoundException('Satış bulunamadı.');
      const c = sale.customer;
      const invoiceType = c.isEInvoicePayer ? 'E_FATURA' : 'E_ARSIV';
      const lines = sale.items.map((i) => {
        const qty = Number(i.quantity);
        const total = Number(i.lineTotal);
        return { name: i.productNameSnapshot, quantity: qty, unitPriceInclVat: qty ? round(total / qty) : total, vatRate: vat, totalInclVat: total };
      });
      if (Number(sale.deliveryFee) > 0) {
        lines.push({ name: 'Teslimat Ücreti', quantity: 1, unitPriceInclVat: Number(sale.deliveryFee), vatRate: vat, totalInclVat: Number(sale.deliveryFee) });
      }
      return {
        sourceType: 'RETAIL_SALE',
        sourceId: sale.id,
        sourceNumber: sale.saleNumber,
        invoiceType,
        series: invoiceType === 'E_FATURA' ? s.eInvoiceSeries : s.eArchiveSeries,
        issueDate: new Date(),
        orderDate: sale.orderDate ?? sale.createdAt,
        currency: sale.currency,
        buyer: {
          name: c.companyTitle || c.displayName,
          vknTckn: c.taxNumber || c.nationalId || null,
          taxOffice: c.taxOffice,
          email: c.email,
          phone: c.phone,
          address: sale.address?.fullAddress ?? null,
          city: sale.address?.city ?? null,
          district: sale.address?.district ?? null,
          postalCode: sale.address?.postalCode ?? null,
        },
        internetSale: null,
        lines,
        totalInclVat: Number(sale.grandTotal),
      };
    }

    const order = await this.prisma.webOrder.findUnique({ where: { id: ref.sourceId }, include: { items: true } });
    if (!order) throw new NotFoundException('Web siparişi bulunamadı.');
    const lines = order.items.map((i) => ({
      name: i.productName, quantity: i.quantity, unitPriceInclVat: Number(i.unitPrice), vatRate: vat, totalInclVat: Number(i.lineTotal),
    }));
    const itemsTotal = lines.reduce((sum, l) => sum + l.totalInclVat, 0);
    const extra = round(Number(order.grandTotal) - itemsTotal);
    if (extra > 0) lines.push({ name: 'Kargo / Hizmet Bedeli', quantity: 1, unitPriceInclVat: extra, vatRate: vat, totalInclVat: extra });
    const corporate = order.invoiceCorporate && !!order.taxNumber;
    return {
      sourceType: 'WEB_ORDER',
      sourceId: order.id,
      sourceNumber: order.orderNumber,
      invoiceType: 'E_ARSIV',
      series: s.eArchiveSeries,
      issueDate: new Date(),
      orderDate: order.createdAt,
      currency: 'TRY',
      buyer: {
        name: (corporate && order.companyTitle) || order.customerName,
        vknTckn: corporate ? order.taxNumber : order.tcKimlik,
        taxOffice: corporate ? order.taxOffice : null,
        email: order.customerEmail,
        phone: order.customerPhone,
        address: order.address,
        city: order.city,
        district: order.district,
        postalCode: order.postalCode,
      },
      internetSale: {
        paymentMeans: order.paymentMethod === 'ONLINE' ? 'CREDIT_CARD' : order.paymentMethod === 'EFT' ? 'EFT' : 'OTHER',
        paymentDate: order.paidAt,
        shippedAt: order.updatedAt,
      },
      lines,
      totalInclVat: Number(order.grandTotal),
    };
  }

  // ─── Fatura kesme ───────────────────────────────────────────────────────

  private assertReady(settings: EInvoiceSettings) {
    if (!this.provider.ready) throw new BadRequestException(this.provider.notReadyReason);
    if (!settings.active) throw new BadRequestException('e-Dönüşüm entegrasyonu pasif. Önce ayarlardan aktif edin.');
  }

  async issue(body: { items?: SourceRef[]; all?: boolean; days?: number }) {
    const settings = await this.loadSettings();
    this.assertReady(settings);
    let refs: SourceRef[] = (body.items ?? []).filter(
      (r) => (r.sourceType === 'RETAIL_SALE' || r.sourceType === 'WEB_ORDER') && Number.isInteger(Number(r.sourceId)),
    );
    if (body.all) {
      const pending = await this.listPending(body.days);
      refs = pending.rows.map((r) => ({ sourceType: r.sourceType, sourceId: r.sourceId }));
    }
    if (!refs.length) throw new BadRequestException('Faturalanacak satış seçilmedi.');
    return this.issueMany(refs, settings);
  }

  /** Satışı faturalamadan çıkar (deneme/iptal satışlar). Kesilmiş canlı fatura varsa izin verilmez */
  async skip(body: { sourceType?: string; sourceId?: number; sourceNumber?: string; customerName?: string; amount?: number }) {
    const sourceType = body.sourceType === 'WEB_ORDER' ? 'WEB_ORDER' : 'RETAIL_SALE';
    const sourceId = Number(body.sourceId);
    if (!Number.isInteger(sourceId) || sourceId <= 0) throw new BadRequestException('Satış seçilmedi.');
    const key = { sourceType_sourceId: { sourceType, sourceId } };
    const existing = await this.prisma.eInvoice.findUnique({ where: key });
    if (existing?.status === 'ISSUED' && existing.provider === 'TRENDYOL_EFATURAM') {
      throw new BadRequestException('Bu satışın canlı faturası kesilmiş; faturalamadan çıkarılamaz.');
    }
    const data = {
      status: 'SKIPPED',
      errorMessage: null,
      sourceNumber: String(body.sourceNumber ?? existing?.sourceNumber ?? `${sourceType}#${sourceId}`),
      customerName: body.customerName ?? existing?.customerName ?? null,
      amount: new Prisma.Decimal(Number(body.amount ?? existing?.amount ?? 0)),
    };
    await this.prisma.eInvoice.upsert({ where: key, create: { ...data, sourceType, sourceId }, update: data });
    return { ok: true };
  }

  /** Faturalama dışı bırakılanı geri al → tekrar faturasız listesine döner */
  async unskip(id: number) {
    const inv = await this.prisma.eInvoice.findUnique({ where: { id } });
    if (!inv || inv.status !== 'SKIPPED') throw new BadRequestException('Bu kayıt faturalama dışı değil.');
    await this.prisma.eInvoice.delete({ where: { id } });
    return { ok: true };
  }

  async retry(id: number) {
    const inv = await this.prisma.eInvoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Fatura kaydı bulunamadı.');
    if (inv.status === 'ISSUED') throw new BadRequestException('Bu fatura zaten kesilmiş.');
    const settings = await this.loadSettings();
    this.assertReady(settings);
    return this.issueMany([{ sourceType: inv.sourceType as SourceType, sourceId: inv.sourceId }], settings);
  }

  private async issueMany(refs: SourceRef[], settings: EInvoiceSettings) {
    let issued = 0;
    let failed = 0;
    for (const ref of refs) {
      const ok = await this.issueOne(ref, settings);
      if (ok) issued++;
      else failed++;
    }
    return { issued, failed };
  }

  private async issueOne(ref: SourceRef, settings: EInvoiceSettings): Promise<boolean> {
    const key = { sourceType_sourceId: { sourceType: ref.sourceType, sourceId: ref.sourceId } };
    const existing = await this.prisma.eInvoice.findUnique({ where: key });
    const tag = providerTag(settings);
    if (existing?.status === 'SKIPPED') return false;
    const sameEnv = existing?.provider === tag;
    if (existing && sameEnv && existing.status === 'ISSUED') return true;
    if (existing && sameEnv && existing.status === 'PENDING' && Date.now() - existing.updatedAt.getTime() < STALE_PENDING_MS) return false;

    let draft: EInvoiceDraft;
    try {
      draft = await this.buildDraft(ref, settings);
    } catch (e) {
      const message = `Fatura taslağı oluşturulamadı: ${(e as Error).message}`;
      this.logger.warn(`${ref.sourceType}#${ref.sourceId} ${message}`);
      await this.prisma.eInvoice.upsert({
        where: key,
        create: { provider: tag, sourceType: ref.sourceType, sourceId: ref.sourceId, sourceNumber: `${ref.sourceType}#${ref.sourceId}`, status: 'ERROR', errorMessage: message, attempts: 1 },
        update: { provider: tag, status: 'ERROR', errorMessage: message, attempts: sameEnv ? { increment: 1 } : 1 },
      });
      return false;
    }

    const base = {
      provider: tag,
      sourceNumber: draft.sourceNumber,
      customerName: draft.buyer.name,
      amount: new Prisma.Decimal(draft.totalInclVat),
      invoiceType: draft.invoiceType,
      status: 'PENDING',
      errorMessage: null,
    };
    // ETTN (UUID) kayıt başına bir kez üretilir; tekrar denemelerde aynı ETTN gider, fatura iki kez kesilmez
    const documentUuid = (sameEnv && existing?.status !== 'ISSUED' && existing?.providerRef) || randomUUID();
    const record = await this.prisma.eInvoice.upsert({
      where: key,
      create: { ...base, providerRef: documentUuid, sourceType: ref.sourceType, sourceId: ref.sourceId, attempts: 1 },
      update: { ...base, providerRef: documentUuid, invoiceNumber: null, pdfUrl: null, issuedAt: null, attempts: sameEnv ? { increment: 1 } : 1 },
    });

    try {
      const result = await this.provider.issue(settings, draft, documentUuid);
      await this.prisma.eInvoice.update({
        where: { id: record.id },
        data: {
          status: 'ISSUED',
          invoiceNumber: result.invoiceNumber,
          providerRef: result.providerRef ?? documentUuid,
          pdfUrl: result.pdfUrl ?? null,
          issuedAt: new Date(),
        },
      });
      if (ref.sourceType === 'RETAIL_SALE' && settings.environment === 'PROD') {
        await this.prisma.retailSale.update({
          where: { id: ref.sourceId },
          data: {
            invoiceStatus: draft.invoiceType === 'E_FATURA' ? 'E_INVOICE' : 'E_ARCHIVE',
            invoiceNote: `${draft.invoiceType === 'E_FATURA' ? 'e-Fatura' : 'e-Arşiv'} ${result.invoiceNumber}`,
          },
        });
      }
      return true;
    } catch (e) {
      const message = (e as Error).message || 'Bilinmeyen hata';
      await this.prisma.eInvoice.update({ where: { id: record.id }, data: { status: 'ERROR', errorMessage: message } });
      this.logger.warn(`Fatura kesilemedi ${ref.sourceType}#${ref.sourceId}: ${message}`);
      return false;
    }
  }

  async pdf(id: number) {
    const inv = await this.prisma.eInvoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Fatura kaydı bulunamadı.');
    if (inv.status !== 'ISSUED' || !inv.providerRef) throw new BadRequestException('Bu fatura henüz kesilmemiş.');
    if (inv.pdfUrl) return { url: inv.pdfUrl };
    const settings = await this.loadSettings();
    try {
      const url = await this.provider.pdfUrl(settings, inv.providerRef, inv.invoiceType === 'E_FATURA' ? 'E_FATURA' : 'E_ARSIV');
      await this.prisma.eInvoice.update({ where: { id }, data: { pdfUrl: url } });
      return { url };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  // ─── Otomatik kesim (15 dk) ─────────────────────────────────────────────

  @Cron('*/15 * * * *')
  async autoIssue() {
    if (!this.provider.ready || this.autoRunning) return;
    const settings = await this.loadSettings();
    // Otomatik kesim sadece canlı ortamda çalışır
    if (!settings.active || !settings.autoIssue || settings.environment !== 'PROD') return;
    this.autoRunning = true;
    try {
      const pending = await this.listPending(7);
      // Aynı satışı sürekli denememek için 3 başarısız denemeden sonra otomatik kesim durur (elle "Tekrar Dene")
      const refs = pending.rows
        .filter((r) => r.attempts < 3)
        .map((r) => ({ sourceType: r.sourceType, sourceId: r.sourceId }));
      if (!refs.length) return;
      const result = await this.issueMany(refs, settings);
      this.logger.log(`Otomatik fatura: ${result.issued} kesildi, ${result.failed} hata`);
    } catch (e) {
      this.logger.error(`Otomatik fatura hatası: ${(e as Error).message}`);
    } finally {
      this.autoRunning = false;
    }
  }
}
