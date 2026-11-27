import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as XLSX from 'xlsx';
import { Prisma } from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { StaffTasksService } from '../staff-tasks/staff-tasks.service';
import { GenericMarketplaceAdapter } from './adapters/generic-marketplace.adapter';
import { HepsiburadaAdapter } from './adapters/hepsiburada.adapter';
import { ExternalOrder, ExternalOrderSummary, IntegrationAdapter, IntegrationPlatform } from './adapters/integration-adapter.interface';
import { summarizeSettlements, SettlementSummary } from './settlements';
import { N11Adapter } from './adapters/n11.adapter';
import { TicimaxAdapter } from './adapters/ticimax.adapter';
import { TrendyolAdapter } from './adapters/trendyol.adapter';
import { TrendrumAdapter } from './adapters/trendrum.adapter';
import { PazaramaAdapter } from './adapters/pazarama.adapter';
import { IdefixAdapter } from './adapters/idefix.adapter';
import { KoctasAdapter } from './adapters/koctas.adapter';
import { AmazonAdapter } from './adapters/amazon.adapter';
import { IntegrationCenterService } from './services/integration-center.service';
import { isSiteOnlyModelCode } from '../common/site-only';
import { FLORA_MODEL_PREFIX, FLORA_PLATFORMS, StoreCode } from '../common/store';

const platforms: Array<{ platform: IntegrationPlatform; displayName: string; hidden?: boolean }> = [
  { platform: 'TRENDYOL', displayName: 'Trendyol' },
  { platform: 'HEPSIBURADA', displayName: 'Hepsiburada' },
  { platform: 'N11', displayName: 'N11' },
  { platform: 'AMAZON', displayName: 'Amazon' },
  { platform: 'WEBSITE', displayName: 'Web Site' },
  { platform: 'TICIMAX', displayName: 'Ticimax', hidden: true },
  { platform: 'TRENDRUM', displayName: 'Trendrum' },
  { platform: 'PAZARAMA', displayName: 'Pazarama' },
  { platform: 'IDEFIX', displayName: 'Idefix' },
  { platform: 'TEKLIKLE', displayName: 'Teklikle' },
  { platform: 'KOCTAS', displayName: 'Koçtaş' },
];

const TICIMAX_PLATFORM: IntegrationPlatform = 'TICIMAX';
const TICIMAX_DEFAULTS = {
  tenant: 'Erhan Flowers',
  siteUrl: 'https://www.erhanflowers.com',
  serviceEndpoint: 'https://www.erhanflowers.com/servis/UrunServis.svc',
  wsdlUrl: 'https://www.erhanflowers.com/servis/UrunServis.svc?wsdl',
};

type TicimaxSettingsPayload = {
  tenant?: unknown;
  siteUrl?: unknown;
  serviceEndpoint?: unknown;
  wsdlUrl?: unknown;
  uyeKodu?: unknown;
};

type TicimaxSettingsRow = {
  tenant: string;
  platform: string;
  siteUrl: string | null;
  serviceEndpoint: string | null;
  wsdlUrl: string | null;
  secretValue: string | null;
  status: string;
  lastTestAt: Date | null;
  lastError: string | null;
};

const AUTO_SYNC_PLATFORMS: IntegrationPlatform[] = ['TRENDYOL', 'HEPSIBURADA', 'N11', 'TICIMAX'];
const AUTO_SYNC_INTERVAL_MS = 60 * 1000;

const FLORA_BLOCK_MESSAGE = `Flora Yapay Çiçek mağazasının ürünü (${FLORA_MODEL_PREFIX}) Erhan Flowers hesabına gönderilmez.`;

@Injectable()
export class IntegrationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationsService.name);
  private autoSyncTimer?: NodeJS.Timeout;
  private autoSyncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly staffTasks: StaffTasksService,
    private readonly trendyolAdapter: TrendyolAdapter,
    private readonly integrationCenter: IntegrationCenterService,
  ) {}

  onModuleInit() {
    this.autoSyncTimer = setInterval(() => this.autoSyncAllPlatforms(), AUTO_SYNC_INTERVAL_MS);
    this.autoSyncAllPlatforms();
  }

  onModuleDestroy() {
    if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
  }

  private async autoSyncAllPlatforms() {
    if (this.autoSyncRunning) return;
    this.autoSyncRunning = true;
    try {
      const owner = await this.prisma.user.findFirst({ where: { role: 'OWNER' }, orderBy: { id: 'asc' }, select: { id: true } });
      if (!owner) return;
      for (const platform of AUTO_SYNC_PLATFORMS) {
        try {
          await this.syncOrders(platform, owner.id);
        } catch (error) {
          this.logger.warn(`Otomatik sipariş senkronizasyonu basarisiz (${platform}): ${this.errorMessage(error)}`);
        }
      }
    } finally {
      this.autoSyncRunning = false;
    }
  }

  private staffSyncPromise: Promise<Array<{ label: string; ok: boolean; imported: number; message?: string }>> | null = null;
  private staffSyncAt = 0;

  /** Personel ekranı "Senkronize Et": tüm platformlardan (Erhan + Flora) siparişleri hemen çeker. Aynı anda tek çalışır. */
  async syncAllForStaff(userId: number) {
    if (this.staffSyncPromise) return { results: await this.staffSyncPromise, reused: true };
    if (Date.now() - this.staffSyncAt < 20_000) return { results: [], reused: true, message: 'Az önce senkronize edildi' };
    const jobs: Array<{ label: string; platform: string; company: string }> = [
      ...AUTO_SYNC_PLATFORMS.map((p) => ({ label: this.displayName(p), platform: p, company: 'ERHAN' })),
      { label: 'Trendyol (Flora)', platform: 'TRENDYOL', company: 'FLORA' },
      { label: 'n11 (Flora)', platform: 'N11', company: 'FLORA' },
    ];
    this.staffSyncPromise = (async () => {
      const results: Array<{ label: string; ok: boolean; imported: number; message?: string }> = [];
      for (const job of jobs) {
        try {
          const r = await this.syncOrders(job.platform, userId, job.company) as { ok?: boolean; imported?: number; message?: string; missingKeys?: string[]; status?: string };
          // API bilgisi girilmemiş / kapalı platform hata sayılmaz
          if (r.ok === false && ((r.missingKeys?.length ?? 0) > 0 || /eksik|missing|tanımlı değil|kapalı|devre dışı/i.test(r.message ?? ''))) continue;
          results.push({ label: job.label, ok: r.ok !== false, imported: Number(r.imported ?? 0), message: r.ok === false ? r.message : undefined });
        } catch (error) {
          results.push({ label: job.label, ok: false, imported: 0, message: this.errorMessage(error) });
        }
      }
      return results;
    })();
    try {
      return { results: await this.staffSyncPromise, reused: false };
    } finally {
      this.staffSyncPromise = null;
      this.staffSyncAt = Date.now();
    }
  }

  /** İade ekranının iki bölümü (Trendyol paneli gibi) */
  static readonly CLAIM_STAGE_CREATED = 'Talep oluşturuldu';
  static readonly CLAIM_STAGE_ARRIVED = 'Bize ulaştı';
  /** Platform durumu → bölüm: müşteri talebi açtı (paket yolda) / paket depoya geldi (aksiyon bekliyor) */
  private claimStage(rawStatuses: string[]): string | null {
    if (rawStatuses.some((x) => ['WaitingInAction', 'AwaitingAction'].includes(x))) return IntegrationsService.CLAIM_STAGE_ARRIVED;
    if (rawStatuses.some((x) => ['Created', 'NewRequest', 'AwaitingPreApproval'].includes(x))) return IntegrationsService.CLAIM_STAGE_CREATED;
    return null;
  }

  /** Bu senkronda gelmeyen (artık açık olmayan) talepleri kapat: ekrandan kalkar */
  private async closeMissingClaims(platform: string, storePrefix: 'FLORA' | 'ERHAN', fetchedClaimIds: string[]) {
    const openLabels = [IntegrationsService.CLAIM_STAGE_CREATED, IntegrationsService.CLAIM_STAGE_ARRIVED, 'Oluşturuldu', 'Aksiyon bekliyor', 'Yeni talep', 'Ön onay bekliyor'];
    await this.prisma.$executeRaw`
      UPDATE marketplace_orders mo
      SET claim_status = 'Kapandı',
          return_status = CASE
            WHEN mo.return_status = 'WAITING' AND NOT EXISTS (SELECT 1 FROM return_videos v WHERE v.order_id = mo.id) THEN 'CLOSED'
            ELSE mo.return_status END,
          return_updated_at = NOW(), updated_at = NOW()
      WHERE mo.platform = ${platform}
        AND mo.claim_id IS NOT NULL
        AND mo.claim_status IN (${Prisma.join(openLabels)})
        AND (${storePrefix} = 'ERHAN' AND mo.external_order_id NOT LIKE 'FLORA\\_%' OR ${storePrefix} = 'FLORA' AND mo.external_order_id LIKE 'FLORA\\_%')
        AND mo.claim_id NOT IN (${fetchedClaimIds.length ? Prisma.join(fetchedClaimIds) : Prisma.sql`'__none__'`})
    `;
  }

  private claimSyncRunning = false;
  private claimSyncAt = 0;

  /** Trendyol durum adı → Türkçe */
  private claimStatusLabel(status: string) {
    return ({
      Created: 'Oluşturuldu', WaitingInAction: 'Aksiyon bekliyor', Accepted: 'Kabul edildi', Rejected: 'Reddedildi',
      Cancelled: 'İptal edildi', Unresolved: 'İhtilaflı', InAnalysis: 'Analizde', WaitingFraudCheck: 'Kontrolde',
    } as Record<string, string>)[status] ?? status;
  }

  /**
   * Hepsiburada + Trendyol (Erhan + Flora) iade taleplerini çekip marketplace_orders'a yazar → İadeler ekranı.
   * Sipariş ERP'de varsa ona işlenir (videosu aynı kayıtta), yoksa iade için yeni kayıt açılır.
   */
  async syncReturnClaims(days = 30) {
    if (this.claimSyncRunning) return { ok: true, results: [], message: 'İade senkronu zaten çalışıyor' };
    this.claimSyncRunning = true;
    const results: Array<{ store: string; ok: boolean; claims: number; created: number; updated: number; message?: string }> = [];
    try {
      const end = Date.now();
      // Açık talepler eski olabilir (müşteri kargoyu geç verir): en az 45 gün geriye bak
      const start = end - Math.min(Math.max(days, 45), 90) * 86400000;
      // Hepsiburada (Erhan)
      try {
        const hb = (await this.adapter('HEPSIBURADA')) as unknown as { fetchClaims?: (statuses?: string[]) => Promise<Array<Record<string, unknown>>> };
        if (typeof hb.fetchClaims === 'function') {
          // Sadece açık talepler: talep oluşturuldu (NewRequest, AwaitingPreApproval) + bize ulaştı (AwaitingAction)
          const claims = (await hb.fetchClaims(['NewRequest', 'AwaitingPreApproval', 'AwaitingAction']))
            .filter((c) => this.claimStage([this.pickField(c as Record<string, any>, ['status', 'claimStatus', 'state'])]));
          let created = 0;
          let updated = 0;
          for (const claim of claims) {
            const r = await this.upsertHepsiburadaClaim(claim);
            if (r === 'created') created += 1; else if (r === 'updated') updated += 1;
          }
          const sample = claims.length && !created && !updated ? ` (tanınmayan alanlar: ${Object.keys(claims[0]).slice(0, 15).join(',')})` : '';
          await this.closeMissingClaims('HEPSIBURADA', 'ERHAN', claims.map((c) => this.pickField(c as Record<string, any>, ['claimNumber', 'number', 'claimId', 'id'])).filter(Boolean));
          results.push({ store: 'Hepsiburada', ok: true, claims: claims.length, created, updated, ...(sample ? { message: sample } : {}) });
        }
      } catch (error) {
        const message = this.errorMessage(error);
        if (!/eksik|missing/i.test(message)) results.push({ store: 'Hepsiburada', ok: false, claims: 0, created: 0, updated: 0, message });
      }

      for (const company of ['ERHAN', 'FLORA']) {
        const store = company === 'ERHAN' ? 'Trendyol' : 'Trendyol (Flora)';
        try {
          const adapter = (company === 'ERHAN' ? await this.adapter('TRENDYOL') : await this.storeAdapter('TRENDYOL', company)) as unknown as {
            fetchClaims?: (s: number, e: number, statuses?: string[]) => Promise<Array<Record<string, any>>>;
          };
          if (typeof adapter.fetchClaims !== 'function') continue;
          // Sadece açık talepler: Created (talep oluşturuldu, paket yolda) + WaitingInAction (bize ulaştı)
          const claims = (await adapter.fetchClaims(start, end, ['Created', 'WaitingInAction']))
            .filter((c) => this.claimStage(this.trendyolClaimStatuses(c)));
          let created = 0;
          let updated = 0;
          for (const claim of claims) {
            const r = await this.upsertTrendyolClaim(claim, company);
            if (r === 'created') created += 1; else if (r === 'updated') updated += 1;
          }
          await this.closeMissingClaims('TRENDYOL', company === 'ERHAN' ? 'ERHAN' : 'FLORA', claims.map((c) => String(c.id ?? c.claimId ?? '')).filter(Boolean));
          results.push({ store, ok: true, claims: claims.length, created, updated });
        } catch (error) {
          const message = this.errorMessage(error);
          // Mağaza bilgisi girilmemişse hata sayma
          if (/eksik|missing/i.test(message)) continue;
          results.push({ store, ok: false, claims: 0, created: 0, updated: 0, message });
        }
      }
    } finally {
      this.claimSyncRunning = false;
      this.claimSyncAt = Date.now();
    }
    return { ok: results.every((r) => r.ok), results };
  }

  /**
   * Platform talep durumlarından ERP iade süreci:
   * açık (yeni / aksiyon bekliyor) → WAITING = "Yeni Gelenler"; ihtilaf → REJECT_REQUESTED; kapanmış → CLOSED.
   * Personelin elle verdiği süreç (red talebi vb.) ve videosu olan kayıt ezilmez; sadece boş/WAITING olan güncellenir.
   */
  private claimProcess(rawStatuses: string[], current: string | null, hasVideos: boolean): string | null {
    const OPEN = ['Created', 'WaitingInAction', 'InAnalysis', 'WaitingFraudCheck', 'NewRequest', 'AwaitingAction', 'AwaitingPreApproval'];
    const DISPUTE = ['Unresolved', 'InDispute'];
    const CLOSED = ['Accepted', 'Rejected', 'Cancelled', 'Refunded'];
    let next: string | null = null;
    if (rawStatuses.some((x) => OPEN.includes(x))) next = 'WAITING';
    else if (rawStatuses.some((x) => DISPUTE.includes(x))) next = 'REJECT_REQUESTED';
    else if (rawStatuses.length && rawStatuses.every((x) => CLOSED.includes(x))) next = 'CLOSED';
    else next = 'WAITING';
    if (!current) return next;
    if (current === 'WAITING' && next !== 'WAITING' && !hasVideos) return next;
    return current;
  }

  private processPatch(current: string | null, next: string | null) {
    return next !== current ? { returnStatus: next, returnUpdatedAt: new Date() } : {};
  }

  /** HB talep durumu → Türkçe */
  private hbClaimStatusLabel(status: string) {
    return ({
      NewRequest: 'Yeni talep', Accepted: 'Kabul edildi', AwaitingAction: 'Aksiyon bekliyor', InDispute: 'İhtilaflı',
      Rejected: 'Reddedildi', Refunded: 'Para iadesi yapıldı', Cancelled: 'İptal edildi', AwaitingPreApproval: 'Ön onay bekliyor',
    } as Record<string, string>)[status] ?? status;
  }

  /** İç içe nesnede ilk dolu alan (ör. 'orderNumber', 'order.orderNumber') */
  private pickField(obj: Record<string, any>, keys: string[]): string {
    for (const key of keys) {
      const v = key.split('.').reduce<any>((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), obj);
      if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') return String(v);
      if (v && typeof v === 'object' && !Array.isArray(v) && (v.name || v.value || v.description)) return String(v.name ?? v.value ?? v.description);
    }
    return '';
  }

  private async upsertHepsiburadaClaim(claim: Record<string, any>): Promise<'created' | 'updated' | 'skipped'> {
    const claimId = this.pickField(claim, ['claimNumber', 'number', 'claimId', 'id']);
    const orderNumber = this.pickField(claim, ['orderNumber', 'order.orderNumber', 'orderId', 'packageNumber', 'order.number']);
    if (!claimId || !orderNumber) return 'skipped';
    const lineArr = (['lineItems', 'items', 'claimLines', 'claimItems', 'lines', 'products'].map((k) => claim[k]).find(Array.isArray) ?? []) as Array<Record<string, any>>;
    const lines = lineArr.length ? lineArr : [claim];
    const statusRaw = this.pickField(claim, ['status', 'claimStatus', 'state']);
    const reasons = Array.from(new Set([claim, ...lineArr].map((x) => {
      const reason = this.pickField(x, ['reason', 'claimReason', 'reasonName', 'returnReason', 'claimType', 'type']);
      const note = this.pickField(x, ['explanation', 'customerNote', 'customerExplanation', 'description', 'note']);
      return [reason, note].filter(Boolean).join(': ');
    }).filter(Boolean)));
    const dateRaw = this.pickField(claim, ['claimDate', 'createdAt', 'createDate', 'requestDate', 'date']);
    const claimDate = dateRaw ? new Date(/^\d{10,}$/.test(dateRaw) ? Number(dateRaw) : dateRaw) : null;
    const claimData = {
      claimId,
      claimStatus: this.claimStage(statusRaw ? [statusRaw] : []) ?? (statusRaw ? this.hbClaimStatusLabel(statusRaw) : null),
      claimReason: reasons.join(' | ') || null,
      claimDate: claimDate && !Number.isNaN(claimDate.getTime()) ? claimDate : null,
    };
    const cargoTracking = this.pickField(claim, ['cargoTrackingNumber', 'trackingNumber', 'returnTrackingNumber', 'cargo.trackingNumber']);

    const existing = await this.prisma.marketplaceOrder.findFirst({
      where: { platform: 'HEPSIBURADA', OR: [{ claimId }, { orderNumber }, { externalOrderId: orderNumber }] },
      orderBy: { id: 'desc' },
      select: { id: true, returnStatus: true, _count: { select: { returnVideos: true } } },
    });
    if (existing) {
      await this.prisma.marketplaceOrder.update({
        where: { id: existing.id },
        data: {
          ...claimData,
          ...this.processPatch(existing.returnStatus, this.claimProcess(statusRaw ? [statusRaw] : [], existing.returnStatus, existing._count.returnVideos > 0)),
          ...(cargoTracking ? { cargoTrackingNumber: cargoTracking } : {}),
        },
      });
      return 'updated';
    }
    const items = lines.map((l) => {
      const qty = Math.max(1, Number(this.pickField(l, ['quantity', 'qty', 'count']) || 1));
      const price = Number(this.pickField(l, ['price.amount', 'unitPrice.amount', 'price', 'unitPrice', 'amount']) || 0);
      return {
        productName: this.pickField(l, ['productName', 'name', 'product.name', 'title']) || 'Hepsiburada ürünü',
        sku: this.pickField(l, ['merchantSku', 'merchantSKU', 'product.merchantSku']) || null,
        barcode: this.pickField(l, ['barcode', 'merchantSku', 'merchantSKU']) || null,
        quantity: qty,
        unitPrice: price,
        totalPrice: price * qty,
        productImageUrl: (this.pickField(l, ['productImageUrlFormat', 'imageUrl', 'productImageUrl']) || '').replace(/\{size\}/gi, '500') || null,
      };
    });
    await this.prisma.marketplaceOrder.create({
      data: {
        platform: 'HEPSIBURADA',
        externalOrderId: `CLAIM_${claimId}`,
        orderNumber,
        status: 'Returned',
        customerName: this.pickField(claim, ['customerName', 'customer.name', 'customer.fullName', 'buyerName']) || null,
        totalAmount: items.reduce((sum, i) => sum + i.totalPrice, 0),
        currency: 'TRY',
        cargoTrackingNumber: cargoTracking || null,
        rawPayload: claim as object,
        stockDeducted: true,
        returnStatus: this.claimProcess(statusRaw ? [statusRaw] : [], null, false),
        returnUpdatedAt: new Date(),
        ...claimData,
        items: { create: items },
      },
    });
    return 'created';
  }

  private trendyolClaimStatuses(claim: Record<string, any>): string[] {
    const lines = Array.isArray(claim.items) ? claim.items as Array<Record<string, any>> : [];
    return Array.from(new Set(lines.flatMap((l) => (Array.isArray(l.claimItems) ? l.claimItems : []) as Array<Record<string, any>>)
      .map((ci) => String(ci.claimItemStatus?.name ?? '')).filter(Boolean)));
  }

  private async upsertTrendyolClaim(claim: Record<string, any>, company: string): Promise<'created' | 'updated' | 'skipped'> {
    const claimId = String(claim.id ?? claim.claimId ?? '');
    const orderNumber = String(claim.orderNumber ?? '');
    if (!claimId || !orderNumber) return 'skipped';
    const isFlora = company !== 'ERHAN';
    const lines = Array.isArray(claim.items) ? claim.items as Array<Record<string, any>> : [];
    const claimItems = lines.flatMap((l) => (Array.isArray(l.claimItems) ? l.claimItems : []) as Array<Record<string, any>>);
    const statuses = Array.from(new Set(claimItems.map((ci) => String(ci.claimItemStatus?.name ?? '')).filter(Boolean)));
    const reasons = Array.from(new Set(claimItems.map((ci) => {
      const reason = String(ci.customerClaimItemReason?.name ?? ci.trendyolClaimItemReason?.name ?? '');
      const note = String(ci.customerNote ?? ci.note ?? '').trim();
      return [reason, note].filter(Boolean).join(': ');
    }).filter(Boolean)));
    const claimStatus = this.claimStage(statuses) ?? (statuses.map((x) => this.claimStatusLabel(x)).join(', ') || null);
    const claimReason = reasons.join(' | ') || null;
    const claimDate = claim.claimDate ? new Date(Number(claim.claimDate) || String(claim.claimDate)) : null;
    const customerName = [claim.customerFirstName, claim.customerLastName].filter(Boolean).join(' ') || null;
    const claimData = {
      claimId,
      claimStatus,
      claimReason,
      claimDate: claimDate && !Number.isNaN(claimDate.getTime()) ? claimDate : null,
    };

    // ERP'deki sipariş: Flora kayıtları FLORA_ önekli
    const existing = await this.prisma.marketplaceOrder.findFirst({
      where: {
        platform: 'TRENDYOL',
        OR: [{ claimId }, { orderNumber }],
        externalOrderId: isFlora ? { startsWith: 'FLORA_' } : { not: { startsWith: 'FLORA_' } },
      },
      orderBy: { id: 'desc' },
      select: { id: true, returnStatus: true, _count: { select: { returnVideos: true } } },
    });
    if (existing) {
      await this.prisma.marketplaceOrder.update({
        where: { id: existing.id },
        data: {
          ...claimData,
          ...this.processPatch(existing.returnStatus, this.claimProcess(statuses, existing.returnStatus, existing._count.returnVideos > 0)),
          ...(claim.cargoTrackingNumber ? { cargoTrackingNumber: String(claim.cargoTrackingNumber) } : {}),
        },
      });
      return 'updated';
    }

    const total = lines.reduce((sum, l) => sum + Number(l.orderLine?.price ?? 0) * Math.max(1, (Array.isArray(l.claimItems) ? l.claimItems.length : 1)), 0);
    await this.prisma.marketplaceOrder.create({
      data: {
        platform: 'TRENDYOL',
        externalOrderId: `${isFlora ? 'FLORA_' : ''}CLAIM_${claimId}`,
        orderNumber,
        status: 'Returned',
        customerName,
        totalAmount: total,
        currency: 'TRY',
        orderDate: claim.orderDate ? new Date(Number(claim.orderDate) || String(claim.orderDate)) : null,
        cargoTrackingNumber: claim.cargoTrackingNumber ? String(claim.cargoTrackingNumber) : null,
        cargoProvider: claim.cargoProviderName ? String(claim.cargoProviderName) : null,
        rawPayload: claim as object,
        stockDeducted: true, // iade kaydı: stok düşümü yapılmaz
        returnStatus: this.claimProcess(statuses, null, false),
        returnUpdatedAt: new Date(),
        ...claimData,
        items: {
          create: lines.map((l) => {
            const ol = (l.orderLine ?? {}) as Record<string, any>;
            const qty = Math.max(1, Array.isArray(l.claimItems) ? l.claimItems.length : 1);
            const price = Number(ol.price ?? 0);
            return {
              productName: String(ol.productName ?? 'Trendyol ürünü'),
              sku: ol.merchantSku ? String(ol.merchantSku) : null,
              barcode: ol.barcode ? String(ol.barcode) : null,
              quantity: qty,
              unitPrice: price,
              totalPrice: price * qty,
            };
          }),
        },
      },
    });
    return 'created';
  }

  /** 30 dakikada bir (her saatin 7. ve 37. dakikası) son 14 günün iadelerini çek */
  @Cron('7,37 * * * *')
  async autoSyncReturnClaims() {
    if (Date.now() - this.claimSyncAt < 10 * 60 * 1000) return;
    try {
      const r = await this.syncReturnClaims(14);
      const failed = r.results.filter((x) => !x.ok);
      if (failed.length) this.logger.warn(`İade senkronu hatası: ${failed.map((f) => `${f.store}: ${f.message}`).join(' | ')}`);
    } catch (error) {
      this.logger.warn(`İade senkronu başarısız: ${this.errorMessage(error)}`);
    }
  }

  async listConnections() {
    await this.ensureConnectionRows();
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT platform, display_name AS "displayName", status, uses_env_credentials AS "usesEnvCredentials",
        last_test_at AS "lastTestAt", last_sync_at AS "lastSyncAt", last_error AS "lastError"
      FROM integration_connections
      ORDER BY CASE platform
        WHEN 'TRENDYOL' THEN 1 WHEN 'HEPSIBURADA' THEN 2 WHEN 'N11' THEN 3 WHEN 'AMAZON' THEN 4 WHEN 'WEBSITE' THEN 5 WHEN 'TICIMAX' THEN 6 ELSE 99 END
    `;
  }

  async getTicimaxSettings(tenantValue?: string) {
    const tenant = this.cleanTenant(tenantValue);
    const row = await this.ensureTicimaxSettings(tenant);
    return this.serializeTicimaxSettings(row);
  }

  async saveTicimaxSettings(payload: TicimaxSettingsPayload) {
    const tenant = this.cleanTenant(payload.tenant);
    const siteUrl = this.cleanUrl(payload.siteUrl, 'Site Adresi') || TICIMAX_DEFAULTS.siteUrl;
    const serviceEndpoint = this.cleanUrl(payload.serviceEndpoint, 'Servis Endpoint') || TICIMAX_DEFAULTS.serviceEndpoint;
    const wsdlUrl = this.cleanUrl(payload.wsdlUrl, 'WSDL Adresi') || TICIMAX_DEFAULTS.wsdlUrl;
    const uyeKodu = this.text(payload.uyeKodu);
    const current = await this.ensureTicimaxSettings(tenant);
    const secretValue = uyeKodu ? this.encryptSecret(uyeKodu) : current.secretValue;
    const status = secretValue ? 'CONFIGURED' : 'MISSING_CREDENTIALS';

    const [row] = await this.prisma.$queryRaw<TicimaxSettingsRow[]>`
      INSERT INTO integration_tenant_settings (
        tenant, platform, site_url, service_endpoint, wsdl_url, secret_value, status, created_at, updated_at
      )
      VALUES (
        ${tenant}, ${TICIMAX_PLATFORM}, ${siteUrl}, ${serviceEndpoint}, ${wsdlUrl}, ${secretValue}, ${status}, NOW(), NOW()
      )
      ON CONFLICT (tenant, platform) DO UPDATE SET
        site_url = EXCLUDED.site_url,
        service_endpoint = EXCLUDED.service_endpoint,
        wsdl_url = EXCLUDED.wsdl_url,
        secret_value = EXCLUDED.secret_value,
        status = EXCLUDED.status,
        last_error = NULL,
        updated_at = NOW()
      RETURNING tenant, platform, site_url AS "siteUrl", service_endpoint AS "serviceEndpoint",
        wsdl_url AS "wsdlUrl", secret_value AS "secretValue", status, last_test_at AS "lastTestAt", last_error AS "lastError"
    `;

    await this.upsertConnectionStatus(TICIMAX_PLATFORM, status, null);
    await this.log(TICIMAX_PLATFORM, 'SAVE_SETTINGS', 'SUCCESS', 'Ticimax bağlantı ayarları kaydedildi.', null, null, { tenant, siteUrl, serviceEndpoint, wsdlUrl, hasUyeKodu: Boolean(secretValue) });
    return this.serializeTicimaxSettings(row);
  }

  async testTicimaxSettings(tenantValue?: string) {
    const tenant = this.cleanTenant(tenantValue);
    const row = await this.ensureTicimaxSettings(tenant);
    const missing: string[] = [];
    if (!row.siteUrl) missing.push('Site Adresi');
    if (!row.serviceEndpoint) missing.push('Servis Endpoint');
    if (!row.wsdlUrl) missing.push('WSDL Adresi');
    if (!row.secretValue) missing.push('UyeKodu');

    if (missing.length > 0) {
      const message = `Ticimax bağlantı bilgileri eksik: ${missing.join(', ')}`;
      await this.updateTicimaxTestResult(tenant, 'MISSING_CREDENTIALS', message);
      return { ok: false, status: 'MISSING_CREDENTIALS', message, missingKeys: missing };
    }

    const result = await this.testWsdlReachability(row.wsdlUrl!);
    const status = result.ok ? 'CONNECTED' : 'FAILED';
    await this.updateTicimaxTestResult(tenant, status, result.ok ? null : result.message);
    await this.log(TICIMAX_PLATFORM, 'TEST_CONNECTION', result.ok ? 'SUCCESS' : status, result.message, null, null, { tenant, wsdlUrl: row.wsdlUrl });
    return { ok: result.ok, status, message: result.message };
  }

  async testConnection(platformValue: string) {
    const platform = this.platform(platformValue);
    if (platform === TICIMAX_PLATFORM) return this.testTicimaxSettings();
    const adapter = await this.adapter(platform);
    const result = await this.safeAdapterTest(adapter);
    await this.prisma.$executeRaw`
      INSERT INTO integration_connections (platform, display_name, status, uses_env_credentials, last_test_at, last_error, created_at, updated_at)
      VALUES (${platform}, ${this.displayName(platform)}, ${result.status}, true, NOW(), ${result.ok ? null : result.message}, NOW(), NOW())
      ON CONFLICT (platform) DO UPDATE SET status = EXCLUDED.status, last_test_at = NOW(), last_error = EXCLUDED.last_error, updated_at = NOW()
    `;
    await this.log(platform, 'TEST_CONNECTION', result.ok ? 'SUCCESS' : result.status, result.message);
    return result;
  }

  async syncOrders(platformValue: string, userId: number, companyCode = 'ERHAN') {
    const platform = this.platform(platformValue);
    const adapter = await this.adapter(platform, companyCode);
    const connection = await this.safeAdapterTest(adapter);
    if (!connection.ok) {
      await this.log(platform, 'FETCH_ORDERS', connection.status, connection.message);
      return { ok: false, imported: 0, duplicated: 0, message: connection.message, missingKeys: connection.missingKeys ?? [] };
    }

    let orders: ExternalOrder[] = [];
    try {
      orders = await adapter.fetchOrders();
    } catch (error) {
      const message = `${this.displayName(platform)} siparişleri alınamadı: ${this.errorMessage(error)}`;
      await this.log(platform, 'FETCH_ORDERS', 'FAILED', message);
      return { ok: false, imported: 0, duplicated: 0, unknownStatus: 0, failed: 0, message, missingKeys: [] };
    }
    // Trendyol sipariş satırlarında görsel genelde gelmez: mağazanın kendi ürün API'sinden barkodla bul
    // (Flora mağazasında ERP'de eşleşen ürün/stok kartı olmadığı için görsel hiç çıkmıyordu)
    if (platform === 'TRENDYOL') await this.fillTrendyolLineImages(adapter, orders, companyCode);

    let imported = 0;
    let duplicated = 0;
    let unknownStatus = 0;
    let failed = 0;
    for (const order of orders) {
      if (order.unknownStatus) {
        unknownStatus += 1;
        await this.log(platform, 'IMPORT_ORDER', 'UNKNOWN', 'Trendyol sipariş durumu eşleştirilemedi; sipariş yeni olarak kaydedilmedi.', order.externalOrderId, null, {
          platformOrderNumber: order.platformOrderNumber,
          externalStatus: order.externalStatus ?? null,
        });
        continue;
      }
      try {
        const result = await this.importExternalOrder({ ...order, companyCode }, userId);
        if (result.created) imported += 1;
        else duplicated += 1;
      } catch (error) {
        failed += 1;
        await this.log(platform, 'IMPORT_ORDER', 'FAILED', this.errorMessage(error), order.externalOrderId, null, {
          platformOrderNumber: order.platformOrderNumber,
          customerName: order.customerName,
        });
      }
    }
    // API'den gelmeyen OUT_FOR_DELIVERY siparişleri DELIVERED yap
    // (platforma göre: açık siparişler listesinde olmayan = teslim edilmiş)
    let autoDelivered = 0;
    if (orders.length > 0) {
      const fetchedExternalIds = orders.map((o) => o.externalOrderId).filter(Boolean);
      const transitOrders = await this.prisma.$queryRaw<{ id: number; external_order_id: string }[]>`
        SELECT id, external_order_id FROM retail_sales
        WHERE channel = ${platform}::"RetailSaleChannel"
          AND status = 'OUT_FOR_DELIVERY'
          AND external_order_id IS NOT NULL
          AND updated_at < NOW() - INTERVAL '3 days'
      `;
      for (const sale of transitOrders) {
        if (!fetchedExternalIds.includes(sale.external_order_id)) {
          try {
            await this.prisma.$executeRaw`
              UPDATE retail_sales SET status = 'DELIVERED'::"RetailSaleStatus", updated_at = NOW()
              WHERE id = ${sale.id}
            `;
            autoDelivered += 1;
          } catch { /* ignore */ }
        }
      }
    }

    // HB satır biçimi düzeltmesinden önce her ürün satırı ayrı (ürünsüz) sipariş olarak kaydediliyordu.
    // Artık sipariş no ile tek kayıt geliyor → eski ürünsüz satır kayıtlarını iptal et (çift görünmesin, ciroya girmesin)
    if (platform === 'HEPSIBURADA') {
      const lineIds = Array.from(((adapter as { regroupedLineIds?: Map<string, string> }).regroupedLineIds ?? new Map()).keys());
      if (lineIds.length) {
        await this.prisma.$executeRaw`
          UPDATE retail_sales s
          SET status = 'CANCELLED'::"RetailSaleStatus", cancelled_at = NOW(),
              internal_note = COALESCE(s.internal_note, '') || ' | Ürünsüz yinelenen HB kaydı; sipariş no ile yeniden alındı',
              updated_at = NOW()
          WHERE s.channel = 'HEPSIBURADA'::"RetailSaleChannel"
            AND s.external_order_id IN (${Prisma.join(lineIds)})
            AND s.status::text NOT IN ('CANCELLED','DELIVERED','COMPLETED')
            AND NOT EXISTS (SELECT 1 FROM retail_sale_items i WHERE i.sale_id = s.id)
        `.catch(() => 0);
      }
    }

    // Hepsiburada /openorders yalnızca henüz paketlenmemiş/kargoya verilmemiş siparişleri döndürür.
    // Listeden düşen aktif sipariş kargoya verilmiştir → personel ekranından kalksın (yolda).
    // (Önceden bu sadece ertesi gün ve ayrı bir senkronla yapılıyordu; kargoya verilen siparişler ekranda kalıyordu.)
    let autoShipped = 0;
    if (platform === 'HEPSIBURADA' && (adapter as { lastFetchComplete?: boolean }).lastFetchComplete === true) {
      const openIds = orders.map((o) => o.externalOrderId).filter(Boolean);
      autoShipped = Number(await this.prisma.$executeRaw`
        UPDATE retail_sales
        SET status = 'OUT_FOR_DELIVERY'::"RetailSaleStatus", updated_at = NOW()
        WHERE channel = 'HEPSIBURADA'::"RetailSaleChannel"
          AND status IN ('CONFIRMED'::"RetailSaleStatus", 'PREPARING'::"RetailSaleStatus", 'IN_PRODUCTION'::"RetailSaleStatus", 'READY'::"RetailSaleStatus")
          AND external_order_id IS NOT NULL
          AND created_at < NOW() - INTERVAL '10 minutes'
          AND company_id = (SELECT id FROM companies WHERE code = ${companyCode} LIMIT 1)
          AND external_order_id NOT IN (${openIds.length ? Prisma.join(openIds) : Prisma.sql`'__none__'`})
      `);
    }

    await this.prisma.$executeRaw`
      UPDATE integration_connections SET status = 'CONNECTED', last_sync_at = NOW(), last_error = NULL, updated_at = NOW()
      WHERE platform = ${platform}
    `;
    await this.log(platform, 'FETCH_ORDERS', 'SUCCESS', `${imported} yeni, ${duplicated} mükerrer, ${unknownStatus} bilinmeyen durum, ${autoDelivered} otomatik teslim edildi${autoShipped ? `, ${autoShipped} kargoya verildi (açık listede yok)` : ''}.`, null, null, { imported, duplicated, unknownStatus, autoDelivered, autoShipped });
    return { ok: true, imported, duplicated, unknownStatus, failed, autoDelivered, autoShipped };
  }

  // Siparişi pazaryerine "hazırlandı/kargolandı" olarak bildirir (paketleme adımı).
  async updatePackageStatus(platformValue: string, payload: { shipmentPackageId?: string; status?: string; lines?: Array<{ lineId: number; quantity: number }>; trackingNumber?: string; cargoProviderId?: number }) {
    const platform = this.platform(platformValue);
    const adapter = await this.adapter(platform);
    const result = await adapter.updateOrderStatus(payload);
    await this.log(platform, 'UPDATE_PACKAGE_STATUS', result.ok ? 'SUCCESS' : 'FAILED', result.message, payload.shipmentPackageId ?? null, null, { status: payload.status });
    return result;
  }

  // Bir gönderimin (batchRequestId) pazaryerinde gerçekten işlenip işlenmediğini
  // sorgular. "Kuyruğa alındı" mesajı gerçek sonuç değildir; bu asenkron sonucu
  // ayrıca kontrol etmek gerekir.
  async checkBatchStatus(platformValue: string, batchRequestId: string, companyValue?: string) {
    const platform = this.platform(platformValue);
    const companyCode = this.text(companyValue).toUpperCase() || 'ERHAN';
    if (!['ERHAN', 'FLORA'].includes(companyCode)) throw new BadRequestException('Mağaza ERHAN veya FLORA olmalıdır.');
    // ERHAN dışı mağazada Erhan'ın .env bilgilerine düşmemek için mağazaya özel bilgiler kullanılır.
    const adapter = companyCode === 'ERHAN' ? await this.adapter(platform) : await this.storeAdapter(platform, companyCode);
    if (!adapter.checkBatchStatus) {
      return { ok: false, status: 'NOT_IMPLEMENTED' as const, message: `${platform} icin batch durumu sorgulama desteklenmiyor.` };
    }
    return adapter.checkBatchStatus(batchRequestId);
  }

  // Trendyol'da görsel silme API'den desteklenmediği için satıcı panelindeki
  // ürün düzenleme sayfasının linkini döner (elle silmek için).
  async getSellerPanelLink(platformValue: string, barcode: string) {
    const platform = this.platform(platformValue);
    const adapter = await this.adapter(platform);
    if (!adapter.getSellerPanelUrl) {
      return { ok: false, status: 'NOT_IMPLEMENTED' as const, message: `${platform} icin panel linki desteklenmiyor.` };
    }
    return adapter.getSellerPanelUrl(barcode);
  }

  // Maliyet ekranından tek bir ürünün fiyat/stoğunu pazaryerine gönderir
  // (ürünü yeniden oluşturmadan, sadece fiyat günceller).
  async pushPrice(platformValue: string, payload: { barcode?: string; salePrice?: number; listPrice?: number; stockQuantity?: number }) {
    const platform = this.platform(platformValue);
    if (this.isSiteOnlyPayload(payload)) return { ok: false, message: 'Sadece sitede satılan ürün (WEB-), pazaryerine gönderilmez.' };
    if (await this.isFloraPayload(payload)) return { ok: false, message: FLORA_BLOCK_MESSAGE };
    const adapter = await this.adapter(platform);
    const result = await adapter.pushPrice(payload);
    await this.log(platform, 'PUSH_PRICE', result.ok ? 'SUCCESS' : 'FAILED', result.message, payload.barcode ?? null, null, { salePrice: payload.salePrice, stockQuantity: payload.stockQuantity });
    return result;
  }

  async pushProduct(platformValue: string, payload: unknown) {
    const platform = this.platform(platformValue);
    if (this.isSiteOnlyPayload(payload)) return { ok: false, message: 'Sadece sitede satılan ürün (WEB-), pazaryerine gönderilmez.' };
    if (await this.isFloraPayload(payload)) return { ok: false, message: FLORA_BLOCK_MESSAGE };
    const adapter = await this.adapter(platform);
    const result = await adapter.pushProduct(payload);
    const barcode = (payload as Record<string, unknown>)?.barcode as string | undefined;
    await this.log(platform, 'PUSH_PRODUCT', result.ok ? 'SUCCESS' : 'FAILED', result.message, barcode ?? null, null, {});
    return result;
  }

  // ── Mağaza ayrımı ─────────────────────────────────────────────
  // pushPrice / pushProduct ERHAN hesaplarına gider. Flora mağazasının ürünleri (store_code = FLORA)
  // buradan ASLA geçmez; Flora ürünleri pushPriceForStore / publishing üzerinden Flora hesaplarına gider.
  async isFloraPayload(payload: unknown): Promise<boolean> {
    const p = (payload ?? {}) as Record<string, unknown>;
    if (String(p.companyCode ?? '').toUpperCase() === 'FLORA') return true;
    const values = ['modelCode', 'productMainId', 'stockCode', 'barcode', 'sku', 'productCode', 'trendyolBarcode']
      .map((key) => (typeof p[key] === 'string' ? (p[key] as string).trim().toUpperCase() : ''))
      .filter(Boolean);
    if (values.length === 0) return false;
    // Doğrudan veritabanı (önbellek yok): yeni açılan Flora ürünü ilk dakikada bile Erhan'a kaçmasın
    const [variant, product] = await Promise.all([
      this.prisma.trendyolProductVariant.findFirst({
        where: { storeCode: 'FLORA', OR: [{ barcode: { in: values } }, { currentModelCode: { in: values, mode: 'insensitive' } }, { supplierStockCode: { in: values, mode: 'insensitive' } }] },
        select: { id: true },
      }),
      this.prisma.product.findFirst({
        where: { storeCode: 'FLORA', OR: [{ barcode: { in: values } }, { modelCode: { in: values, mode: 'insensitive' } }] },
        select: { id: true },
      }),
    ]);
    return !!(variant || product);
  }

  // Flora ürününün fiyat/stoğunu Flora'nın KENDİ hesaplarına gönderir (ürün açmaz, sadece günceller).
  // API bilgisi girilmemiş platformlar atlanır.
  async pushPriceForStore(store: StoreCode, payload: { barcode?: string; modelCode?: string; salePrice?: number; listPrice?: number; stockQuantity?: number }, platforms: readonly string[] = FLORA_PLATFORMS) {
    if (store === 'ERHAN') {
      const results = [];
      for (const platform of platforms) results.push({ platform, ...(await this.pushPrice(platform, payload)) });
      return results;
    }
    if (this.isSiteOnlyPayload(payload)) return [];
    const results: Array<{ platform: string; ok: boolean; message: string; skipped?: boolean }> = [];
    for (const value of platforms) {
      const platform = this.platform(value);
      let adapter: IntegrationAdapter;
      try {
        adapter = await this.storeAdapter(platform, store);
      } catch (error) {
        results.push({ platform, ok: false, skipped: true, message: this.errorMessage(error) });
        continue;
      }
      try {
        const result = await adapter.pushPrice(payload);
        await this.log(`${platform}_${store}`, 'PUSH_PRICE', result.ok ? 'SUCCESS' : 'FAILED', result.message, payload.barcode ?? null, null, { salePrice: payload.salePrice, stockQuantity: payload.stockQuantity });
        results.push({ platform, ok: result.ok, message: result.message });
      } catch (error) {
        results.push({ platform, ok: false, message: this.errorMessage(error) });
      }
    }
    return results;
  }

  // Sadece bu ürünler: model kodu / barkod / stok kodu WEB- ile başlayan site ürünleri (diğer ürünler etkilenmez)
  private isSiteOnlyPayload(payload: unknown): boolean {
    const p = (payload ?? {}) as Record<string, unknown>;
    return ['modelCode', 'productMainId', 'stockCode', 'barcode', 'sku', 'productCode']
      .some((key) => typeof p[key] === 'string' && isSiteOnlyModelCode(p[key] as string));
  }

  async importOrderExcel(platformValue: string, file: Express.Multer.File | undefined, userId: number) {
    const platform = this.platform(platformValue);
    if (platform !== 'TRENDYOL') {
      return { ok: false, imported: 0, duplicated: 0, failed: 0, total: 0, message: 'Excel sipariş içe aktarma şu an Trendyol için hazır.' };
    }
    if (!file?.buffer?.length) {
      return { ok: false, imported: 0, duplicated: 0, failed: 0, total: 0, message: 'Excel dosyası seçilmedi.' };
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { ok: false, imported: 0, duplicated: 0, failed: 0, total: 0, message: 'Excel sayfası okunamadı.' };

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
    const orders = this.parseTrendyolOrderRows(rows);
    let imported = 0;
    let duplicated = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const result = await this.importExternalOrder(order, userId);
        if (result.created) imported += 1;
        else duplicated += 1;
      } catch (error) {
        failed += 1;
        await this.log(platform, 'IMPORT_ORDER_EXCEL', 'FAILED', this.errorMessage(error), order.externalOrderId, null, {
          platformOrderNumber: order.platformOrderNumber,
          itemCount: order.items.length,
        });
      }
    }

    const message = `${imported} yeni, ${duplicated} mükerrer sipariş Excel ile işlendi.`;
    await this.log(platform, 'IMPORT_ORDER_EXCEL', failed ? 'FAILED' : 'SUCCESS', message, null, null, {
      sourceFile: file.originalname,
      rowCount: rows.length,
      orderCount: orders.length,
      imported,
      duplicated,
      failed,
    });
    return { ok: failed === 0, imported, duplicated, failed, total: orders.length, message };
  }

  private async safeAdapterTest(adapter: IntegrationAdapter) {
    try {
      return await adapter.testConnection();
    } catch (error) {
      return {
        ok: false,
        status: 'FAILED' as const,
        message: `${this.displayName(adapter.platform)} API bağlantısı kurulamadı: ${this.errorMessage(error)}`,
        missingKeys: [],
      };
    }
  }

  private parseTrendyolOrderRows(rows: Array<Record<string, unknown>>): ExternalOrder[] {
    const grouped = new Map<string, ExternalOrder>();
    for (const row of rows) {
      const platformOrderNumber = this.rowText(row, ['siparis no', 'siparis numarasi', 'order number', 'order no']);
      const packageNumber = this.rowText(row, ['paket no', 'paket numarasi', 'teslimat no', 'shipment package', 'package']);
      const barcode = this.rowText(row, ['barkod', 'barcode']);
      const modelCode = this.rowText(row, ['stok kodu', 'model kodu', 'stok no', 'stock code', 'sku']);
      const productName = this.rowText(row, ['urun adi', 'urun', 'product name', 'product']);
      if (!platformOrderNumber && !packageNumber && !barcode && !productName) continue;

      const key = packageNumber || platformOrderNumber || `ROW:${grouped.size + 1}`;
      const existing = grouped.get(key);
      const totalAmount = this.rowNumber(row, ['satis tutari', 'toplam tutar', 'faturalanacak tutar', 'total amount', 'grand total']);
      const order = existing ?? {
        externalOrderId: key,
        platformOrderNumber: platformOrderNumber || key,
        platform: 'TRENDYOL' as const,
        status: 'CONFIRMED' as const,
        invoiceStatus: 'WAITING' as const,
        customerName: this.rowText(row, ['musteri adi', 'alici', 'ad soyad', 'buyer', 'customer']) || 'Trendyol Müşteri',
        phone: this.rowText(row, ['telefon', 'gsm', 'phone', 'alici telefon']),
        addressText: this.rowText(row, ['adres', 'teslimat adresi', 'address']),
        city: this.rowText(row, ['il', 'sehir', 'city']) || undefined,
        district: this.rowText(row, ['ilce', 'district']) || undefined,
        totalAmount: totalAmount || 0,
        paidAmount: totalAmount || 0,
        paymentStatus: 'PAID' as const,
        cargoProvider: this.rowText(row, ['kargo firmasi', 'kargo', 'cargo provider']) || undefined,
        cargoTrackingNumber: this.rowText(row, ['kargo kodu', 'kargo takip', 'cargo code', 'tracking number']) || undefined,
        orderDate: this.rowDate(row, ['siparis tarihi', 'siparis tarih', 'order date', 'created date']),
        items: [],
      };

      const quantity = this.rowNumber(row, ['adet', 'miktar', 'quantity', 'urun adedi']) || 1;
      const unitPrice = this.rowNumber(row, ['birim fiyat', 'satis fiyati', 'urun tutari', 'price', 'unit price']);
      order.items.push({
        externalLineId: this.rowText(row, ['kalem id', 'line id', 'order line id']) || undefined,
        externalVariantId: this.rowText(row, ['urun id', 'product id', 'listing id']) || barcode || modelCode || undefined,
        productName: productName || modelCode || barcode || 'Trendyol Ürün',
        variationText: this.rowText(row, ['renk', 'beden', 'varyasyon', 'variant']) || undefined,
        sku: modelCode || undefined,
        barcode: barcode || undefined,
        modelCode: modelCode || undefined,
        quantity,
        unitPrice,
      });
      order.totalAmount = order.totalAmount || this.roundMoney(order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
      order.paidAmount = order.totalAmount;
      grouped.set(key, order);
    }
    return Array.from(grouped.values()).filter((order) => order.items.length > 0);
  }

  private rowText(row: Record<string, unknown>, candidates: string[]) {
    for (const [key, value] of Object.entries(row)) {
      const normalized = this.normalizeHeader(key);
      if (candidates.some((candidate) => normalized.includes(this.normalizeHeader(candidate)))) {
        const text = this.text(value);
        if (text) return text;
      }
    }
    return '';
  }

  private rowNumber(row: Record<string, unknown>, candidates: string[]) {
    const text = this.rowText(row, candidates).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const value = Number(text);
    return Number.isFinite(value) ? value : 0;
  }

  private rowDate(row: Record<string, unknown>, candidates: string[]) {
    const text = this.rowText(row, candidates);
    if (!text) return undefined;
    const parts = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (parts) {
      const date = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]), Number(parts[4] ?? 0), Number(parts[5] ?? 0));
      return Number.isNaN(date.getTime()) ? undefined : date;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private normalizeHeader(value: string) {
    return value
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ıİ]/g, 'i')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  async orderSummary(platformValue?: string) {
    const platformText = this.text(platformValue).toUpperCase();
    const platform = platformText ? this.platform(platformText) : 'TRENDYOL';
    if (platform === 'TRENDYOL') {
      try {
        const adapter = await this.adapter(platform);
        if (adapter.fetchOrderSummary) return await adapter.fetchOrderSummary();
      } catch (error) {
        await this.log(platform, 'FETCH_ORDER_SUMMARY', 'FAILED', this.errorMessage(error));
      }
    }
    return this.localOrderSummary(platform);
  }

  async listOrders(query: Record<string, string> = {}) {
    const platform = this.text(query.platform).toUpperCase();
    const q = this.text(query.q);
    const statuses = this.text(query.status)
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const page = Math.max(1, Number(query.page) || 1);
    const take = Math.min(500, Math.max(1, Number(query.pageSize ?? query.take) || 200));
    const offset = (page - 1) * take;
    const sort = this.text(query.sort);
    const orderBy =
      sort === 'oldest'
        ? Prisma.sql`COALESCE(s.order_date, s.created_at) ASC`
        : sort === 'due'
          ? Prisma.sql`COALESCE(s.delivery_due_at, s.order_date, s.created_at) ASC`
          : Prisma.sql`COALESCE(s.order_date, s.created_at) DESC`;
    const customerName = this.text(query.customerName);
    const saleNumber = this.text(query.saleNumber);
    const platformOrderNumber = this.text(query.platformOrderNumber);
    const packageNumber = this.text(query.packageNumber);
    const barcode = this.text(query.barcode);
    const cargoCode = this.text(query.cargoCode);
    const productName = this.text(query.productName);
    const modelCode = this.text(query.modelCode);
    const phone = this.text(query.phone);
    const cargoProvider = this.text(query.cargoProvider);
    const startDate = this.text(query.startDate);
    const endDate = this.text(query.endDate);
    const companyCode = this.text(query.company).toUpperCase();

    return this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT s.id, s.sale_number AS "saleNumber", s.platform_order_number AS "platformOrderNumber",
        s.external_order_id AS "externalOrderId", s.channel AS platform, s.status,
        s.integration_sync_status AS "integrationSyncStatus", s.last_synced_at AS "lastSyncedAt",
        s.order_date AS "orderDate", s.delivery_due_at AS "deliveryDueAt", s.created_at AS "createdAt",
        s.cargo_provider AS "cargoProvider", s.cargo_tracking_number AS "cargoTrackingNumber",
        s.grand_total AS "grandTotal", s.subtotal, s.delivery_fee AS "deliveryFee", s.invoice_status AS "invoiceStatus",
        s.invoice_note AS "invoiceNote", s.cancelled_at AS "cancelledAt", s.internal_note AS "internalNote",
        co.code AS "companyCode", co.name AS "companyName",
        c.display_name AS "customerName", c.phone, c.customer_type AS "customerType",
        a.city, a.district, a.full_address AS "fullAddress",
        d.status AS "deliveryStatus", d.delivery_note AS "deliveryNote",
        u.name AS "cancelledByName",
        COUNT(i.id)::int AS "itemCount",
        COALESCE(SUM(i.quantity), 0)::float AS quantity,
        COALESCE(SUM((i.line_total - COALESCE(i.unit_cost_snapshot, 0) * i.quantity)), 0)::float AS "estimatedProfit",
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', i.id,
              'barcode', i.barcode,
              'modelCode', i.model_code,
              'productName', i.product_name_snapshot,
              'variationText', i.variation_text,
              'quantity', i.quantity,
              'unitPrice', i.unit_price,
              'lineTotal', i.line_total,
              -- HB görsel adresleri {size} yer tutucusuyla gelebilir
              'imagePath', REPLACE(COALESCE(
                sc.image_path,
                (SELECT sci.file_path FROM stock_card_images sci WHERE sci.stock_card_id = sc.id AND sci.is_main = true LIMIT 1),
                (SELECT sci.file_path FROM stock_card_images sci WHERE sci.stock_card_id = sc.id ORDER BY sci.id LIMIT 1),
                sc.external_image_url,
                i.external_image_url,
                (SELECT img->>'url' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(tpv.images) = 'array' THEN tpv.images ELSE '[]'::jsonb END) AS img WHERE img->>'url' IS NOT NULL AND img->>'url' <> '' LIMIT 1),
                (SELECT url FROM products p, jsonb_array_elements_text(CASE WHEN jsonb_typeof(p.image_urls) = 'array' THEN p.image_urls ELSE '[]'::jsonb END) AS url WHERE ((i.barcode IS NOT NULL AND p.barcode = i.barcode) OR (i.model_code IS NOT NULL AND p.model_code = REGEXP_REPLACE(i.model_code, '^FL-', ''))) LIMIT 1),
                -- HB/N11/Amazon satıcı stok kodu (ör. SD-3030) Trendyol barkodundan farklı olabilir:
                -- Trendyol varyantının stok/model koduyla ve stok kartının sku/model/eski model koduyla da ara
                (SELECT img->>'url' FROM trendyol_product_variants v2, jsonb_array_elements(CASE WHEN jsonb_typeof(v2.images) = 'array' THEN v2.images ELSE '[]'::jsonb END) AS img WHERE i.model_code IS NOT NULL AND i.model_code <> '' AND (UPPER(v2.supplier_stock_code) = UPPER(REGEXP_REPLACE(i.model_code, '^FL-', '')) OR UPPER(v2.current_model_code) = UPPER(REGEXP_REPLACE(i.model_code, '^FL-', ''))) AND img->>'url' IS NOT NULL AND img->>'url' <> '' LIMIT 1),
                (SELECT sc2.image_path FROM stock_cards sc2 WHERE i.model_code IS NOT NULL AND i.model_code <> '' AND (UPPER(sc2.sku) = UPPER(REGEXP_REPLACE(i.model_code, '^FL-', '')) OR UPPER(sc2.model) = UPPER(REGEXP_REPLACE(i.model_code, '^FL-', '')) OR UPPER(sc2.old_model_code) = UPPER(REGEXP_REPLACE(i.model_code, '^FL-', ''))) AND sc2.image_path IS NOT NULL AND sc2.image_path <> '' LIMIT 1),
                -- Son çare: ürün adıyla eşleştir (marka ön eki atılır; çok kısa adlarda yanlış eşleşmeyi önlemek için en az 12 karakter)
                (SELECT img->>'url' FROM trendyol_product_variants v3, jsonb_array_elements(CASE WHEN jsonb_typeof(v3.images) = 'array' THEN v3.images ELSE '[]'::jsonb END) AS img WHERE LENGTH(REGEXP_REPLACE(LOWER(TRIM(i.product_name_snapshot)), '^(erhan flowers|flora yapay çiçek|flora) +', '')) >= 12 AND LOWER(v3.product_name) LIKE '%' || REGEXP_REPLACE(LOWER(TRIM(i.product_name_snapshot)), '^(erhan flowers|flora yapay çiçek|flora) +', '') || '%' AND img->>'url' IS NOT NULL AND img->>'url' <> '' ORDER BY (LOWER(TRIM(v3.product_name)) = LOWER(TRIM(i.product_name_snapshot))) DESC, LENGTH(v3.product_name) LIMIT 1),
                (SELECT url FROM products p3, jsonb_array_elements_text(CASE WHEN jsonb_typeof(p3.image_urls) = 'array' THEN p3.image_urls ELSE '[]'::jsonb END) AS url WHERE LENGTH(REGEXP_REPLACE(LOWER(TRIM(i.product_name_snapshot)), '^(erhan flowers|flora yapay çiçek|flora) +', '')) >= 12 AND LOWER(p3.product_name) LIKE '%' || REGEXP_REPLACE(LOWER(TRIM(i.product_name_snapshot)), '^(erhan flowers|flora yapay çiçek|flora) +', '') || '%' AND url IS NOT NULL AND url <> '' LIMIT 1),
                -- Stok kartı eşleşti ama satır barkodu (HB/N11 satıcı kodu) Trendyol barkodundan farklıysa
                (SELECT img->>'url' FROM trendyol_product_variants v4, jsonb_array_elements(CASE WHEN jsonb_typeof(v4.images) = 'array' THEN v4.images ELSE '[]'::jsonb END) AS img WHERE sc.barcode IS NOT NULL AND v4.barcode = sc.barcode AND img->>'url' IS NOT NULL AND img->>'url' <> '' LIMIT 1)
              ), '{size}', '500'),
              'color', sc.color,
              'trendyolUrl', tpv.trendyol_product_url
            )
            ORDER BY i.id
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM retail_sales s
      JOIN retail_customers c ON c.id = s.customer_id
      LEFT JOIN companies co ON co.id = s.company_id
      LEFT JOIN retail_customer_addresses a ON a.id = s.address_id
      LEFT JOIN retail_deliveries d ON d.sale_id = s.id
      LEFT JOIN users u ON u.id = s.cancelled_by_id
      LEFT JOIN retail_sale_items i ON i.sale_id = s.id
      LEFT JOIN stock_cards sc ON sc.id = i.stock_card_id
        OR (i.stock_card_id IS NULL AND i.barcode IS NOT NULL AND sc.barcode = i.barcode)
        OR (i.stock_card_id IS NULL AND i.model_code IS NOT NULL AND sc.sku = REGEXP_REPLACE(i.model_code, '^FL-', ''))
      LEFT JOIN trendyol_product_variants tpv ON tpv.barcode = COALESCE(i.barcode, sc.barcode)
      WHERE (s.integration_sync_status IS NULL OR s.integration_sync_status <> 'MANUAL')
        AND (${companyCode} = '' OR co.code = ${companyCode})
        AND (${platform} = '' OR s.channel::text = ${platform})
        AND (${statuses.length} = 0 OR s.status::text IN (${Prisma.join(statuses.length ? statuses : ['__NONE__'])}))
        AND (${q} = '' OR s.sale_number ILIKE ${`%${q}%`} OR s.platform_order_number ILIKE ${`%${q}%`} OR c.display_name ILIKE ${`%${q}%`} OR c.phone ILIKE ${`%${q}%`})
        AND (${customerName} = '' OR c.display_name ILIKE ${`%${customerName}%`})
        AND (${saleNumber} = '' OR s.sale_number ILIKE ${`%${saleNumber}%`})
        AND (${platformOrderNumber} = '' OR s.platform_order_number ILIKE ${`%${platformOrderNumber}%`})
        AND (${packageNumber} = '' OR s.external_order_id ILIKE ${`%${packageNumber}%`} OR s.platform_order_number ILIKE ${`%${packageNumber}%`})
        AND (${barcode} = '' OR EXISTS (SELECT 1 FROM retail_sale_items x WHERE x.sale_id = s.id AND x.barcode ILIKE ${`%${barcode}%`}))
        AND (${cargoCode} = '' OR s.cargo_tracking_number ILIKE ${`%${cargoCode}%`})
        AND (${productName} = '' OR EXISTS (SELECT 1 FROM retail_sale_items x WHERE x.sale_id = s.id AND x.product_name_snapshot ILIKE ${`%${productName}%`}))
        AND (${modelCode} = '' OR EXISTS (SELECT 1 FROM retail_sale_items x WHERE x.sale_id = s.id AND x.model_code ILIKE ${`%${modelCode}%`}))
        AND (${phone} = '' OR c.phone ILIKE ${`%${phone}%`})
        AND (${cargoProvider} = '' OR s.cargo_provider ILIKE ${`%${cargoProvider}%`})
        AND (${startDate} = '' OR COALESCE(s.order_date, s.created_at)::date >= ${startDate}::date)
        AND (${endDate} = '' OR COALESCE(s.order_date, s.created_at)::date <= ${endDate}::date)
      GROUP BY s.id, c.display_name, c.phone, c.customer_type, a.city, a.district, a.full_address, d.status, d.delivery_note, u.name, co.code, co.name
      ORDER BY ${orderBy}
      LIMIT ${take} OFFSET ${offset}
    `);
  }

  async listMarketplaceOrders(query: Record<string, string>) {
    // Mağaza: FLORA siparişleri external_order_id = FLORA_<id>. platform=FLORA_TRENDYOL gibi değerler de kabul edilir.
    let platform = this.text(query.platform).toUpperCase();
    let company = this.text(query.company).toUpperCase();
    if (platform.startsWith('FLORA_')) { platform = platform.slice(6); company = 'FLORA'; }
    if (company !== 'FLORA' && company !== 'ERHAN') company = '';
    const q = this.text(query.q);
    const take = Math.min(Number(query.pageSize ?? 200), 500);
    const page = Math.max(1, Number(query.page ?? 1));
    const offset = (page - 1) * take;
    const startDate = this.text(query.startDate);
    const endDate = this.text(query.endDate);
    const statuses = this.text(query.status)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // excludeDelivered: varsayılan true — status parametresi yoksa Delivered/Cancelled hariç tutulur
    const excludeDelivered = !statuses.length && query.excludeDelivered !== 'false';

    return this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        mo.id,
        mo.order_number AS "saleNumber",
        mo.order_number AS "platformOrderNumber",
        mo.external_order_id AS "externalOrderId",
        mo.platform,
        mo.status,
        mo.customer_name AS "customerName",
        mo.total_amount AS "grandTotal",
        mo.cargo_amount AS "deliveryFee",
        mo.order_date AS "orderDate",
        mo.created_at AS "createdAt",
        mo.cargo_tracking_number AS "cargoTrackingNumber",
        mo.cargo_provider AS "cargoProvider",
        CASE WHEN mo.external_order_id LIKE 'FLORA\\_%' THEN 'FLORA' ELSE 'ERHAN' END AS "companyCode",
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', moi.id,
              'productName', moi.product_name,
              'barcode', moi.barcode,
              'modelCode', moi.sku,
              'quantity', moi.quantity,
              'unitPrice', moi.unit_price,
              'lineTotal', moi.total_price,
              'imagePath', REPLACE(COALESCE(
                moi.product_image_url,
                sc.image_path,
                (SELECT sci.file_path FROM stock_card_images sci WHERE sci.stock_card_id = sc.id AND sci.is_main = true LIMIT 1),
                (SELECT sci.file_path FROM stock_card_images sci WHERE sci.stock_card_id = sc.id ORDER BY sci.id LIMIT 1),
                sc.external_image_url,
                (SELECT img->>'url' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(tpv.images) = 'array' THEN tpv.images ELSE '[]'::jsonb END) AS img WHERE img->>'url' IS NOT NULL AND img->>'url' <> '' LIMIT 1),
                (SELECT url FROM products p, jsonb_array_elements_text(CASE WHEN jsonb_typeof(p.image_urls) = 'array' THEN p.image_urls ELSE '[]'::jsonb END) AS url WHERE ((moi.barcode IS NOT NULL AND p.barcode = moi.barcode) OR (moi.sku IS NOT NULL AND p.model_code = moi.sku) OR (moi.sku IS NOT NULL AND p.model_code = REGEXP_REPLACE(moi.sku, '^FL-', ''))) AND url IS NOT NULL AND url <> '' LIMIT 1),
                (SELECT sc2.image_path FROM stock_cards sc2 WHERE (sc2.barcode = moi.barcode OR sc2.sku = moi.sku OR (moi.sku IS NOT NULL AND sc2.sku = REGEXP_REPLACE(moi.sku, '^FL-', ''))) AND sc2.image_path IS NOT NULL AND sc2.image_path <> '' LIMIT 1),
                (SELECT img->>'url' FROM trendyol_product_variants v2, jsonb_array_elements(CASE WHEN jsonb_typeof(v2.images) = 'array' THEN v2.images ELSE '[]'::jsonb END) AS img WHERE moi.sku IS NOT NULL AND moi.sku <> '' AND (UPPER(v2.supplier_stock_code) = UPPER(REGEXP_REPLACE(moi.sku, '^FL-', '')) OR UPPER(v2.current_model_code) = UPPER(REGEXP_REPLACE(moi.sku, '^FL-', ''))) AND img->>'url' IS NOT NULL AND img->>'url' <> '' LIMIT 1),
                -- Son çare: ürün adıyla eşleştir (marka ön eki atılır; çok kısa adlarda yanlış eşleşmeyi önlemek için en az 12 karakter)
                (SELECT img->>'url' FROM trendyol_product_variants v3, jsonb_array_elements(CASE WHEN jsonb_typeof(v3.images) = 'array' THEN v3.images ELSE '[]'::jsonb END) AS img WHERE LENGTH(REGEXP_REPLACE(LOWER(TRIM(moi.product_name)), '^(erhan flowers|flora yapay çiçek|flora) +', '')) >= 12 AND LOWER(v3.product_name) LIKE '%' || REGEXP_REPLACE(LOWER(TRIM(moi.product_name)), '^(erhan flowers|flora yapay çiçek|flora) +', '') || '%' AND img->>'url' IS NOT NULL AND img->>'url' <> '' ORDER BY (LOWER(TRIM(v3.product_name)) = LOWER(TRIM(moi.product_name))) DESC, LENGTH(v3.product_name) LIMIT 1),
                (SELECT url FROM products p3, jsonb_array_elements_text(CASE WHEN jsonb_typeof(p3.image_urls) = 'array' THEN p3.image_urls ELSE '[]'::jsonb END) AS url WHERE LENGTH(REGEXP_REPLACE(LOWER(TRIM(moi.product_name)), '^(erhan flowers|flora yapay çiçek|flora) +', '')) >= 12 AND LOWER(p3.product_name) LIKE '%' || REGEXP_REPLACE(LOWER(TRIM(moi.product_name)), '^(erhan flowers|flora yapay çiçek|flora) +', '') || '%' AND url IS NOT NULL AND url <> '' LIMIT 1),
                (SELECT sci2.file_path FROM stock_cards sc2, stock_card_images sci2 WHERE (sc2.barcode = moi.barcode OR sc2.sku = moi.sku OR (moi.sku IS NOT NULL AND sc2.sku = REGEXP_REPLACE(moi.sku, '^FL-', ''))) AND sci2.stock_card_id = sc2.id ORDER BY sci2.is_main DESC, sci2.id LIMIT 1),
                (SELECT COALESCE(
                  line_item->>'productImage',
                  line_item->>'imageUrl',
                  line_item->>'productImageUrl',
                  line_item->>'thumbnailUrl',
                  line_item->'images'->0->>'url'
                ) FROM jsonb_array_elements(
                  CASE
                    WHEN jsonb_typeof(mo.raw_payload->'lines') = 'array' THEN mo.raw_payload->'lines'
                    WHEN jsonb_typeof(mo.raw_payload->'orderlines') = 'array' THEN mo.raw_payload->'orderlines'
                    WHEN jsonb_typeof(mo.raw_payload->'orderItems') = 'array' THEN mo.raw_payload->'orderItems'
                    ELSE '[]'::jsonb
                  END
                ) AS line_item WHERE (moi.barcode IS NOT NULL AND (line_item->>'barcode' = moi.barcode OR line_item->>'productCode' = moi.barcode OR line_item->>'hepsiburadaSku' = moi.barcode) OR moi.sku IS NOT NULL AND (line_item->>'merchantSku' = moi.sku OR line_item->>'stockCode' = moi.sku OR line_item->>'productSellerCode' = moi.sku OR line_item->>'hepsiburadaSku' = moi.sku)) AND COALESCE(line_item->>'productImage', line_item->>'imageUrl', line_item->>'productImageUrl', line_item->>'thumbnailUrl', line_item->'images'->0->>'url') IS NOT NULL AND COALESCE(line_item->>'productImage', line_item->>'imageUrl', line_item->>'productImageUrl', line_item->>'thumbnailUrl', line_item->'images'->0->>'url') <> '' LIMIT 1)
              ), '{size}', '500')
            )
            ORDER BY moi.id
          ) FILTER (WHERE moi.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM marketplace_orders mo
      LEFT JOIN marketplace_order_items moi ON moi.order_id = mo.id
      LEFT JOIN stock_cards sc ON sc.barcode = moi.barcode OR (moi.barcode IS NULL AND sc.sku = moi.sku) OR (moi.barcode IS NULL AND moi.sku IS NOT NULL AND sc.sku = REGEXP_REPLACE(moi.sku, '^FL-', ''))
      LEFT JOIN trendyol_product_variants tpv ON tpv.barcode = COALESCE(moi.barcode, sc.barcode)
      WHERE (${platform} = '' OR mo.platform = ${platform})
        AND (${company} = ''
          OR (${company} = 'FLORA' AND mo.external_order_id LIKE 'FLORA\\_%')
          OR (${company} = 'ERHAN' AND mo.external_order_id NOT LIKE 'FLORA\\_%'))
        AND (${q} = '' OR mo.order_number ILIKE ${`%${q}%`} OR mo.customer_name ILIKE ${`%${q}%`} OR mo.external_order_id ILIKE ${`%${q}%`})
        AND (${startDate} = '' OR COALESCE(mo.order_date, mo.created_at)::date >= ${startDate}::date)
        AND (${endDate} = '' OR COALESCE(mo.order_date, mo.created_at)::date <= ${endDate}::date)
        AND (${statuses.length} > 0
          OR NOT ${excludeDelivered}
          OR mo.status NOT IN ('Delivered', 'DELIVERED', 'Cancelled', 'CANCELLED', 'Returned', 'RETURNED')
        )
        AND (${statuses.length} = 0 OR mo.status = ANY(${statuses}::text[]))
      GROUP BY mo.id
      ORDER BY COALESCE(mo.order_date, mo.created_at) DESC
      LIMIT ${take} OFFSET ${offset}
    `);
  }

  async listRetailOrders(query: Record<string, string>) {
    const take = Math.min(Number(query.limit ?? 200), 500);
    const page = Math.max(1, Number(query.page ?? 1));
    const offset = (page - 1) * take;
    const statusFilter = this.text(query.status ?? 'PAYMENT_PENDING,CONFIRMED,PREPARING,IN_PRODUCTION,READY');

    return this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        s.id,
        s.event_key        AS "saleNumber",
        s.channel::text    AS platform,
        s.status::text     AS status,
        COALESCE(c.display_name, c.first_name || ' ' || COALESCE(c.last_name,'')) AS "customerName",
        c.phone,
        a.city,
        a.district,
        a.full_address     AS "fullAddress",
        s.customer_note    AS "customerNote",
        s.internal_note    AS "internalNote",
        s.cargo_provider   AS "cargoProvider",
        s.order_date       AS "orderDate",
        s.delivery_due_at  AS "deliveryDueAt",
        s.created_at       AS "createdAt",
        s.grand_total      AS "grandTotal",
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id',          si.id,
              'productName', si.product_name_snapshot,
              'modelCode',   si.model_code,
              'barcode',     si.barcode,
              'quantity',    si.quantity,
              'imagePath',   si.external_image_url
            ) ORDER BY si.id
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM retail_sales s
      LEFT JOIN retail_customers c   ON c.id = s.customer_id
      LEFT JOIN retail_customer_addresses a ON a.id = s.address_id
      LEFT JOIN retail_sale_items si ON si.sale_id = s.id
      WHERE s.channel::text = ANY(string_to_array('STORE,PHONE,WHATSAPP,INSTAGRAM,OTHER', ','))
        AND s.status::text = ANY(string_to_array(${statusFilter}, ','))
        AND (s.integration_sync_status = 'MANUAL' OR s.integration_sync_status IS NULL)
      GROUP BY s.id, c.id, a.id
      ORDER BY s.created_at DESC
      LIMIT ${take} OFFSET ${offset}
    `);
  }

  async listWebOrders(query: Record<string, string>) {
    const q = this.text(query.q);
    const take = Math.min(Number(query.pageSize ?? 200), 500);
    const page = Math.max(1, Number(query.page ?? 1));
    const offset = (page - 1) * take;
    const startDate = this.text(query.startDate);
    const endDate = this.text(query.endDate);

    return this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        wo.id,
        wo.order_number AS "saleNumber",
        wo.order_number AS "platformOrderNumber",
        wo.order_number AS "externalOrderId",
        'WEBSITE' AS platform,
        wo.status::text AS status,
        wo.customer_name AS "customerName",
        wo.customer_phone AS phone,
        wo.city,
        wo.district,
        wo.address AS "fullAddress",
        wo.grand_total AS "grandTotal",
        wo.subtotal,
        wo.payment_method AS "paymentMethod",
        wo.paid_at AS "paidAt",
        wo.note AS "internalNote",
        wo.created_at AS "orderDate",
        wo.created_at AS "createdAt",
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', woi.id,
              'productName', woi.product_name,
              'quantity', woi.quantity,
              'unitPrice', woi.unit_price,
              'lineTotal', woi.line_total,
              'imagePath', woi.product_image
            )
            ORDER BY woi.id
          ) FILTER (WHERE woi.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM web_orders wo
      LEFT JOIN web_order_items woi ON woi.order_id = wo.id
      WHERE (${q} = '' OR wo.order_number ILIKE ${`%${q}%`} OR wo.customer_name ILIKE ${`%${q}%`} OR wo.customer_phone ILIKE ${`%${q}%`})
        AND (${startDate} = '' OR wo.created_at::date >= ${startDate}::date)
        AND (${endDate} = '' OR wo.created_at::date <= ${endDate}::date)
        AND (${this.text(query.status)} = '' OR wo.status::text = ANY(string_to_array(${this.text(query.status)}, ',')))
      GROUP BY wo.id
      ORDER BY wo.created_at DESC
      LIMIT ${take} OFFSET ${offset}
    `);
  }

  async webOrderPrintData(id: number) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        wo.id,
        wo.order_number AS "saleNumber",
        wo.status::text AS status,
        wo.customer_name AS "customerName",
        wo.customer_phone AS "customerPhone",
        wo.city,
        wo.district,
        wo.address AS "fullAddress",
        wo.grand_total AS "grandTotal",
        wo.note AS "customerNote",
        wo.created_at AS "createdAt",
        wo.payment_method AS "paymentMethod",
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', woi.id,
              'productNameSnapshot', woi.product_name,
              'quantity', woi.quantity,
              'unitPrice', woi.unit_price,
              'lineTotal', woi.line_total,
              'imagePath', woi.product_image
            )
            ORDER BY woi.id
          ) FILTER (WHERE woi.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM web_orders wo
      LEFT JOIN web_order_items woi ON woi.order_id = wo.id
      WHERE wo.id = ${id}
      GROUP BY wo.id
    `);
    if (!rows.length) throw new Error('Web sipariş bulunamadı.');
    const wo = rows[0];
    return {
      company: {
        name: 'Erhan Flowers',
        website: 'www.erhanflowers.com',
        phone: '0544 654 62 20',
        address: 'Sarılar Mahallesi Cumhuriyet Caddesi No: 52, Manavgat / Antalya',
      },
      sale: { ...wo, channel: 'WEB', source: 'WEB' },
    };
  }

  async operationsSummary() {
    const [summary] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS "todayOrders",
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS "newOrders",
        COUNT(*) FILTER (WHERE status IN ('PREPARING', 'IN_PRODUCTION'))::int AS "inProduction",
        COUNT(*) FILTER (WHERE status = 'READY')::int AS ready,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE integration_sync_status = 'MATCHING_REQUIRED')::int AS "matchingRequired"
      FROM retail_sales
      WHERE (integration_sync_status IS NULL OR integration_sync_status <> 'MANUAL')
    `;
    const byPlatform = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT channel::text AS platform, COUNT(*)::int AS count
      FROM retail_sales
      WHERE (integration_sync_status IS NULL OR integration_sync_status <> 'MANUAL')
      GROUP BY channel
      ORDER BY count DESC
    `;
    const taskLoad = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT assignment_group AS "assignmentGroup", status, COUNT(*)::int AS count
      FROM production_staff_tasks
      WHERE status IN ('NEW', 'SEEN', 'STARTED', 'BLOCKED')
      GROUP BY assignment_group, status
      ORDER BY assignment_group, status
    `;
    // Günlük ciro: firma bazlı + genel toplam
    const dailyRevenue = await this.prisma.$queryRaw<Array<{ companyCode: string; companyName: string; todayRevenue: number; todayOrders: number }>>`
      SELECT co.code AS "companyCode", co.name AS "companyName",
        COALESCE(SUM(s.grand_total) FILTER (WHERE s.created_at::date = CURRENT_DATE AND s.status NOT IN ('CANCELLED')), 0)::float AS "todayRevenue",
        COUNT(*) FILTER (WHERE s.created_at::date = CURRENT_DATE AND s.status NOT IN ('CANCELLED'))::int AS "todayOrders"
      FROM companies co
      LEFT JOIN retail_sales s ON s.company_id = co.id AND (s.integration_sync_status IS NULL OR s.integration_sync_status <> 'MANUAL')
      WHERE co.is_active = true
      GROUP BY co.id, co.code, co.name
      ORDER BY co.code
    `;
    const totalDailyRevenue = dailyRevenue.reduce((sum, r) => sum + Number(r.todayRevenue), 0);
    return { ...summary, byPlatform, taskLoad, dailyRevenue, totalDailyRevenue };
  }

  private async localOrderSummary(platform: IntegrationPlatform): Promise<ExternalOrderSummary> {
    const [summary] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'PAYMENT_PENDING'))::int AS new,
        COUNT(*) FILTER (WHERE status IN ('PREPARING', 'IN_PRODUCTION'))::int AS processing,
        COUNT(*) FILTER (WHERE status = 'READY')::int AS ready,
        COUNT(*) FILTER (WHERE status = 'OUT_FOR_DELIVERY')::int AS transit,
        COUNT(*) FILTER (WHERE status IN ('DELIVERED', 'COMPLETED'))::int AS delivered,
        0::int AS reshipment,
        COUNT(*) FILTER (WHERE integration_sync_status = 'MATCHING_REQUIRED')::int AS hold,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled,
        COUNT(*) FILTER (WHERE invoice_status = 'RETURNED')::int AS returned
      FROM retail_sales
      WHERE (integration_sync_status IS NULL OR integration_sync_status <> 'MANUAL')
        AND channel::text = ${platform}
    `;
    return {
      total: Number(summary?.total ?? 0),
      new: Number(summary?.new ?? 0),
      processing: Number(summary?.processing ?? 0),
      ready: Number(summary?.ready ?? 0),
      transit: Number(summary?.transit ?? 0),
      delivered: Number(summary?.delivered ?? 0),
      reshipment: Number(summary?.reshipment ?? 0),
      hold: Number(summary?.hold ?? 0),
      cancelled: Number(summary?.cancelled ?? 0),
      returned: Number(summary?.returned ?? 0),
      lastUpdatedAt: new Date().toISOString(),
      source: 'LOCAL',
    };
  }

  listLogs(status?: string) {
    const cleanStatus = this.text(status).toUpperCase();
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, platform, action, status, message, external_order_id AS "externalOrderId", sale_id AS "saleId",
        started_at AS "startedAt", completed_at AS "completedAt", payload_summary AS "payloadSummary"
      FROM integration_sync_logs
      WHERE (${cleanStatus} = '' OR status = ${cleanStatus})
      ORDER BY started_at DESC
      LIMIT 200
    `;
  }

  /** barkod → görsel URL (null = bulunamadı); mağaza başına, 6 saat geçerli */
  private readonly lineImageCache = new Map<string, { url: string | null; at: number }>();

  private async fillTrendyolLineImages(adapter: unknown, orders: ExternalOrder[], companyCode: string) {
    const a = adapter as { fetchProductImageByBarcode?: (barcode: string) => Promise<string | null> };
    if (typeof a.fetchProductImageByBarcode !== 'function') return;
    let lookups = 0;
    for (const order of orders) {
      for (const item of order.items) {
        if (item.imageUrl || !item.barcode) continue;
        const key = `${companyCode}:${item.barcode}`;
        const cached = this.lineImageCache.get(key);
        if (cached && Date.now() - cached.at < 6 * 3600_000) {
          if (cached.url) item.imageUrl = cached.url;
          continue;
        }
        if (lookups >= 60) continue; // bir senkronda en fazla 60 sorgu (API sınırı)
        lookups += 1;
        const url = await a.fetchProductImageByBarcode(item.barcode).catch(() => null);
        this.lineImageCache.set(key, { url, at: Date.now() });
        if (url) item.imageUrl = url;
      }
    }
  }

  private async importExternalOrder(order: ExternalOrder, userId: number) {
    const companyPrefix = order.companyCode && order.companyCode !== 'ERHAN' ? `${order.companyCode}:` : '';
    const idempotencyKey = `${companyPrefix}${order.platform}:${order.externalOrderId}`;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${idempotencyKey}))`;
      const existing = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM retail_sales WHERE idempotency_key = ${idempotencyKey} LIMIT 1
      `;
      if (existing[0]) {
        const saleId = existing[0].id;
        const status = order.status ?? null;
        const invoiceStatus = order.invoiceStatus ?? null;
        const prevRows = await tx.$queryRaw<Array<{ invoice_status: string }>>`
          SELECT invoice_status FROM retail_sales WHERE id = ${saleId}
        `;
        const prevInvoiceStatus = prevRows[0]?.invoice_status;
        await tx.$executeRaw`
          UPDATE retail_sales
          SET status = CASE
                -- Kapanmış sipariş değişmez
                WHEN status::text IN ('DELIVERED','COMPLETED','CANCELLED') THEN status
                -- Platform kargoya verdi / teslim etti / iptal etti: "Hazır" (fotoğraflı) siparişler de ilerler,
                -- yoksa kargoya verilmiş sipariş personel ekranında "Kargo Bekleniyor"da takılı kalır
                WHEN ${status}::text IN ('OUT_FOR_DELIVERY','DELIVERED','COMPLETED','CANCELLED')
                THEN ${status}::"RetailSaleStatus"
                -- Personelin ilerlettiği durum (Hazır / yolda) platformun eski "onaylandı" bilgisiyle geri gitmez
                WHEN status::text IN ('READY','OUT_FOR_DELIVERY') THEN status
                -- ERP'de "İşleme Al" denen sipariş, platform hâlâ "yeni/onaylandı" diyorsa Yeni'ye geri düşmez
                WHEN status::text IN ('PREPARING','IN_PRODUCTION') AND ${status}::text IN ('CONFIRMED','PAYMENT_PENDING') THEN status
                ELSE COALESCE(${status}::"RetailSaleStatus", status)
              END,
              invoice_status = COALESCE(${invoiceStatus}::"RetailInvoiceStatus", invoice_status),
              order_date = COALESCE(${order.orderDate ?? null}, order_date),
              delivery_due_at = COALESCE(${order.deliveryDueAt ?? null}, delivery_due_at),
              cargo_provider = COALESCE(${order.cargoProvider ?? null}, cargo_provider),
              cargo_tracking_number = COALESCE(${order.cargoTrackingNumber ?? null}, cargo_tracking_number),
              last_synced_at = NOW(),
              updated_at = NOW()
          WHERE id = ${saleId}
        `;
        // Daha önce kaydedilmemiş görsel URL'leri varsa item'lara ekle
        for (const item of order.items) {
          if (!item.imageUrl) continue;
          if (item.externalLineId) {
            await tx.$executeRaw`
              UPDATE retail_sale_items
              SET external_image_url = ${item.imageUrl}
              WHERE sale_id = ${saleId}
                AND external_line_id = ${item.externalLineId}
                AND (external_image_url IS NULL OR external_image_url = '' OR external_image_url LIKE '%{size}%')
            `;
          } else if (item.barcode || item.modelCode) {
            await tx.$executeRaw`
              UPDATE retail_sale_items
              SET external_image_url = ${item.imageUrl}
              WHERE sale_id = ${saleId}
                AND (barcode = ${item.barcode ?? null} OR model_code = ${item.modelCode ?? null})
                AND (external_image_url IS NULL OR external_image_url = '' OR external_image_url LIKE '%{size}%')
            `;
          }
        }
        if (invoiceStatus === 'RETURNED' && prevInvoiceStatus !== 'RETURNED') {
          await this.returnSaleStockTx(tx, saleId, userId);
        }
        return { created: false, saleId };
      }

      const customer = await this.ensureCustomer(tx, order, userId);
      const address = await this.ensureAddress(tx, Number(customer.id), order, userId);
      const saleNumber = await this.nextSaleNumber(tx);
      const totals = this.orderTotals(order);
      const status = order.status ?? (totals.remainingTotal > 0 ? 'PAYMENT_PENDING' : 'CONFIRMED');
      const invoiceStatus = order.invoiceStatus ?? 'WAITING';
      const syncStatus = await this.hasUnmatchedItems(order) ? 'MATCHING_REQUIRED' : 'SYNCED';
      const companyCode = order.companyCode ?? 'ERHAN';
      const saleRows = await tx.$queryRaw<Array<{ id: number }>>`
        INSERT INTO retail_sales (
          sale_number, customer_id, address_id, channel, sale_type, status, currency, subtotal, discount_total,
          delivery_fee, grand_total, paid_total, remaining_total, customer_note, internal_note, event_key, created_by_id,
          platform_order_number, external_order_id, idempotency_key, integration_sync_status, last_synced_at,
          cargo_provider, cargo_tracking_number, order_date, delivery_due_at, invoice_status, company_id, created_at, updated_at
        )
        VALUES (
          ${saleNumber}, ${Number(customer.id)}, ${Number(address.id)}, ${order.platform}::"RetailSaleChannel", 'DELIVERY_SALE'::"RetailSaleType",
          ${status}::"RetailSaleStatus", 'TRY', ${totals.subtotal}, 0, 0, ${totals.grandTotal}, ${totals.paidTotal}, ${totals.remainingTotal},
          NULL, ${`Platform siparişi: ${order.platform}`}, ${`INTEGRATION_ORDER:${idempotencyKey}`}, ${userId},
          ${order.platformOrderNumber}, ${order.externalOrderId}, ${idempotencyKey}, ${syncStatus}, NOW(),
          ${order.cargoProvider ?? null}, ${order.cargoTrackingNumber ?? null}, ${order.orderDate ?? null}, ${order.deliveryDueAt ?? null}, ${invoiceStatus}::"RetailInvoiceStatus",
          (SELECT id FROM companies WHERE code = ${companyCode} LIMIT 1),
          NOW(), NOW()
        )
        RETURNING id
      `;
      const saleId = saleRows[0].id;
      await tx.$executeRaw`
        INSERT INTO retail_sale_status_history (sale_id, old_status, new_status, note, changed_by_id, changed_at)
        VALUES (${saleId}, NULL, ${status}::"RetailSaleStatus", 'Entegrasyon siparişi oluşturuldu.', ${userId}, NOW())
      `;

      for (const item of order.items) {
        const match = await this.matchItem(tx, item.barcode, item.modelCode, item.externalVariantId);
        const lineTotal = this.roundMoney(item.quantity * item.unitPrice);
        const itemRows = await tx.$queryRaw<Array<{ id: number; stockCardId: number | null; unit: string | null }>>`
          INSERT INTO retail_sale_items (
            sale_id, variant_id, stock_card_id, barcode, model_code, product_name_snapshot, external_line_id,
            external_variant_id, external_image_url, variation_text, quantity, unit_price, discount_amount, line_total, unit_cost_snapshot,
            stock_fulfillment_type, created_at
          )
          VALUES (
            ${saleId}, ${match.variantId}, ${match.stockCardId}, ${item.barcode ?? null}, ${item.modelCode ?? null}, ${item.productName},
            ${item.externalLineId ?? null}, ${item.externalVariantId ?? null}, ${item.imageUrl ?? null}, ${item.variationText ?? null}, ${item.quantity},
            ${item.unitPrice}, 0, ${lineTotal}, ${match.unitCost}, 'READY_STOCK'::"StockFulfillmentType", NOW()
          )
          RETURNING id, stock_card_id AS "stockCardId", (SELECT unit FROM stock_cards WHERE id = stock_card_id) AS unit
        `;
        if (itemRows[0]?.stockCardId) {
          await this.deductStockForOrderItem(
            tx,
            Number(itemRows[0].stockCardId),
            saleId,
            Number(itemRows[0].id),
            item.quantity,
            String(itemRows[0].unit ?? 'Adet'),
            userId,
            order.platform,
            order.platformOrderNumber,
          );
        } else if (match.productId) {
          await this.deductStockForOrderProduct(
            tx,
            match.productId,
            saleId,
            Number(itemRows[0].id),
            match.variantId,
            item.quantity,
            userId,
            order.platform,
            order.platformOrderNumber,
          );
        } else if (match.variantId) {
          await this.deductStockForOrderVariant(
            tx,
            match.variantId,
            saleId,
            Number(itemRows[0].id),
            item.quantity,
            userId,
            order.platform,
            order.platformOrderNumber,
          );
        }
        if (match.variantId) {
          await this.deductRecipeStockForOrder(tx, match.variantId, saleId, Number(itemRows[0].id), item.quantity, userId);
        }
      }

      await tx.$executeRaw`
        INSERT INTO retail_deliveries (
          sale_id, address_id, delivery_type, status, planned_date, planned_time, delivery_note, event_key, created_at, updated_at
        )
        VALUES (${saleId}, ${Number(address.id)}, 'CARGO'::"RetailDeliveryType", 'WAITING'::"RetailDeliveryStatus",
          ${order.deliveryDueAt ?? null}, NULL, ${order.cargoProvider ?? null}, ${`DELIVERY:${saleId}`}, NOW(), NOW())
      `;

      await this.staffTasks.createTasksForSale(tx, saleId);
      await this.log(order.platform, 'IMPORT_ORDER', 'SUCCESS', 'Sipariş içe aktarıldı.', order.externalOrderId, saleId, { itemCount: order.items.length });
      return { created: true, saleId };
    });
  }

  // Pazaryeri siparişi ERP'ye düştüğü anda stok gerçekten düşer (rezervasyon değil).
  // Yetersiz stok siparişin içe aktarılmasını engellemez; stok eksiye düşebilir,
  // hareket kaydında bu görünür kalır ki fark sonradan sayım/tedarik ile kapatılabilsin.
  private async deductStockForOrderItem(
    tx: Prisma.TransactionClient,
    stockCardId: number,
    saleId: number,
    saleItemId: number,
    quantity: number,
    unit: string,
    userId: number,
    platform: IntegrationPlatform,
    platformOrderNumber: string,
  ) {
    const eventKey = `ORDER_STOCK_OUT:${saleId}:${saleItemId}`;
    const existing = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM stock_movements WHERE event_key = ${eventKey} LIMIT 1`;
    if (existing[0]) return;

    await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${stockCardId} FOR UPDATE`;
    const cards = await tx.$queryRaw<Array<{ stockQuantity: number }>>`SELECT stock_quantity AS "stockQuantity" FROM stock_cards WHERE id = ${stockCardId}`;
    const previousStock = Number(cards[0]?.stockQuantity ?? 0);
    const nextStock = previousStock - quantity;

    await tx.$executeRaw`
      UPDATE stock_cards SET stock_quantity = ${nextStock}, last_movement_at = NOW(), updated_at = NOW()
      WHERE id = ${stockCardId}
    `;
    await tx.$executeRaw`
      INSERT INTO stock_movements (
        stock_card_id, type, quantity, unit, previous_stock, next_stock, reason, reference_type, reference_id, event_key, created_by_id, created_at
      )
      VALUES (
        ${stockCardId}, 'OUT', ${quantity}, ${unit}, ${previousStock}, ${nextStock},
        ${`${this.displayName(platform)} siparişi ${platformOrderNumber}`}, 'RETAIL_SALE', ${String(saleId)}, ${eventKey}, ${userId}, NOW()
      )
      ON CONFLICT (event_key) DO NOTHING
    `;
  }

  // Ürün Merkezi ürünleri (henüz stok kartına taşınmamış) için aynı düşüm mantığı.
  // Bulunursa bağlı trendyol_product_variants.stock_quantity alanı da eşitlenir.
  private async deductStockForOrderProduct(
    tx: Prisma.TransactionClient,
    productId: number,
    saleId: number,
    saleItemId: number,
    variantId: number | null,
    quantity: number,
    userId: number,
    platform: IntegrationPlatform,
    platformOrderNumber: string,
  ) {
    const eventKey = `ORDER_STOCK_OUT:${saleId}:${saleItemId}`;
    const existing = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM stock_movements WHERE event_key = ${eventKey} LIMIT 1`;
    if (existing[0]) return;

    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
    const products = await tx.$queryRaw<Array<{ stockQuantity: number }>>`SELECT stock_quantity AS "stockQuantity" FROM products WHERE id = ${productId}`;
    const previousStock = Number(products[0]?.stockQuantity ?? 0);
    const nextStock = previousStock - quantity;

    await tx.$executeRaw`UPDATE products SET stock_quantity = ${nextStock}, updated_at = NOW() WHERE id = ${productId}`;
    if (variantId) {
      await tx.$executeRaw`UPDATE trendyol_product_variants SET stock_quantity = ${nextStock}, updated_at = NOW() WHERE id = ${variantId}`;
    }
    await tx.$executeRaw`
      INSERT INTO stock_movements (
        product_id, type, quantity, unit, previous_stock, next_stock, reason, reference_type, reference_id, event_key, created_by_id, created_at
      )
      VALUES (
        ${productId}, 'OUT', ${quantity}, 'Adet', ${previousStock}, ${nextStock},
        ${`${this.displayName(platform)} siparişi ${platformOrderNumber}`}, 'RETAIL_SALE', ${String(saleId)}, ${eventKey}, ${userId}, NOW()
      )
      ON CONFLICT (event_key) DO NOTHING
    `;
  }

  // "Trendyol Maliyet" ekranından içe aktarılmış ama henüz bir ürün/stok kartına
  // bağlanmamış (aile/maliyet ataması yapılmamış) varyasyonlar için: kendi
  // stock_quantity alanından düşer, böylece maliyet eşleştirmesi tamamlanmayı beklemez.
  private async deductStockForOrderVariant(
    tx: Prisma.TransactionClient,
    variantId: number,
    saleId: number,
    saleItemId: number,
    quantity: number,
    userId: number,
    platform: IntegrationPlatform,
    platformOrderNumber: string,
  ) {
    const eventKey = `ORDER_STOCK_OUT:${saleId}:${saleItemId}`;
    const existing = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM stock_movements WHERE event_key = ${eventKey} LIMIT 1`;
    if (existing[0]) return;

    await tx.$queryRaw`SELECT id FROM trendyol_product_variants WHERE id = ${variantId} FOR UPDATE`;
    const rows = await tx.$queryRaw<Array<{ stockQuantity: number }>>`SELECT stock_quantity AS "stockQuantity" FROM trendyol_product_variants WHERE id = ${variantId}`;
    const previousStock = Number(rows[0]?.stockQuantity ?? 0);
    const nextStock = previousStock - quantity;

    await tx.$executeRaw`UPDATE trendyol_product_variants SET stock_quantity = ${nextStock}, updated_at = NOW() WHERE id = ${variantId}`;
    await tx.$executeRaw`
      INSERT INTO stock_movements (
        variant_id, type, quantity, unit, previous_stock, next_stock, reason, reference_type, reference_id, event_key, created_by_id, created_at
      )
      VALUES (
        ${variantId}, 'OUT', ${quantity}, 'Adet', ${previousStock}, ${nextStock},
        ${`${this.displayName(platform)} siparişi ${platformOrderNumber}`}, 'RETAIL_SALE', ${String(saleId)}, ${eventKey}, ${userId}, NOW()
      )
      ON CONFLICT (event_key) DO NOTHING
    `;
  }

  // Bitmiş ürünün kendi stoğu ayrı; bu, o ürünün ONAYLI reçetesindeki (yaprak,
  // gövde, saksı vb.) gerçek malzemeleri de ayrı ayrı düşer — dükkan satışlarındaki
  // deductRecipeStock ile aynı mantık, farkla: burada yetersiz stok siparişi
  // engellemez (marketplace siparişi zaten kesinleşmiş), stok eksiye düşebilir.
  private async deductRecipeStockForOrder(tx: Prisma.TransactionClient, variantId: number, saleId: number, saleItemId: number, saleQuantity: number, userId: number) {
    const draft = await tx.productCostDraft.findUnique({
      where: { variantId },
      include: { items: true, pots: true },
    });
    if (!draft || draft.status !== 'APPROVED') return;

    const recipeRows = [...draft.items, ...draft.pots]
      .filter((row) => row.source !== 'MANUAL' && row.stockCardId && Number(row.quantity) > 0)
      .map((row) => ({
        stockCardId: Number(row.stockCardId),
        quantity: Number(row.quantity) * saleQuantity,
        unit: 'unit' in row ? (row as { unit: string }).unit : 'adet',
      }));

    for (const row of recipeRows) {
      const eventKey = `ORDER_RECIPE_STOCK_OUT:${saleId}:${saleItemId}:${row.stockCardId}`;
      const existing = await tx.stockUsageLog.findUnique({ where: { eventKey } });
      if (existing) continue;

      await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${row.stockCardId} FOR UPDATE`;
      const stockCard = await tx.stockCard.findUnique({ where: { id: row.stockCardId } });
      if (!stockCard) continue;

      const previousStock = Number(stockCard.stockQuantity);
      const nextStock = previousStock - row.quantity;
      const updated = await tx.stockCard.update({
        where: { id: row.stockCardId },
        data: { stockQuantity: nextStock, lastMovementAt: new Date() },
      });

      await tx.stockUsageLog.create({
        data: {
          stockCardId: row.stockCardId,
          variantId,
          eventType: 'ORDER_SHIPPED',
          eventKey,
          quantity: row.quantity,
          unit: row.unit,
          previousStock,
          nextStock: Number(updated.stockQuantity),
          userId,
        },
      });
    }
  }

  private async matchItem(tx: Prisma.TransactionClient, barcode?: string, modelCode?: string, externalVariantId?: string) {
    const variants = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, product_id AS "productId", barcode, current_model_code AS "currentModelCode", proposed_model_code AS "proposedModelCode"
      FROM trendyol_product_variants
      WHERE (${barcode ?? ''} <> '' AND barcode = ${barcode ?? ''})
        OR (${modelCode ?? ''} <> '' AND (current_model_code = ${modelCode ?? ''} OR proposed_model_code = ${modelCode ?? ''}))
        OR (${externalVariantId ?? ''} <> '' AND CAST(id AS text) = ${externalVariantId ?? ''})
      LIMIT 1
    `;
    const variant = variants[0];

    // 1) Doğrudan barcode/sku eşleştirmesi
    let stockCards = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, automatic_unit_cost AS "automaticUnitCost", manual_unit_cost AS "manualUnitCost", manual_unit_cost_enabled AS "manualUnitCostEnabled"
      FROM stock_cards
      WHERE (${barcode ?? ''} <> '' AND barcode = ${barcode ?? ''})
        OR (${modelCode ?? ''} <> '' AND (sku = ${modelCode ?? ''} OR old_model_code = ${modelCode ?? ''} OR model = ${modelCode ?? ''}))
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    // 2) marketplace_sku_mappings üzerinden eşleştirme (SKU eşleştirme ekranından girilmiş)
    if (!stockCards[0] && (barcode || modelCode)) {
      const externalSku = barcode || modelCode || '';
      stockCards = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT sc.id, sc.automatic_unit_cost AS "automaticUnitCost", sc.manual_unit_cost AS "manualUnitCost", sc.manual_unit_cost_enabled AS "manualUnitCostEnabled"
        FROM marketplace_sku_mappings msm
        JOIN stock_cards sc ON sc.id = msm.stock_card_id
        WHERE msm.external_sku = ${externalSku}
           OR msm.external_barcode = ${externalSku}
        ORDER BY sc.updated_at DESC
        LIMIT 1
      `.catch(() => []);
    }
    // 3) channel_product_mappings üzerinden eşleştirme (kanal bazlı haritalama)
    if (!stockCards[0] && (barcode || modelCode)) {
      const externalSku = barcode || modelCode || '';
      stockCards = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT sc.id, sc.automatic_unit_cost AS "automaticUnitCost", sc.manual_unit_cost AS "manualUnitCost", sc.manual_unit_cost_enabled AS "manualUnitCostEnabled"
        FROM channel_product_mappings cpm
        JOIN stock_cards sc ON sc.id = cpm.stock_card_id
        WHERE cpm.external_sku = ${externalSku}
        ORDER BY sc.updated_at DESC
        LIMIT 1
      `.catch(() => []);
    }
    const stockCard = stockCards[0];

    let productId = variant?.productId ? Number(variant.productId) : null;
    let productCostPrice: number | null = null;
    if (!stockCard) {
      const products = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, cost_price AS "costPrice" FROM products
        WHERE (${productId ?? 0} > 0 AND id = ${productId ?? 0})
          OR (${barcode ?? ''} <> '' AND barcode = ${barcode ?? ''})
          OR (${modelCode ?? ''} <> '' AND model_code = ${modelCode ?? ''})
        LIMIT 1
      `;
      if (products[0]) {
        productId = Number(products[0].id);
        productCostPrice = Number(products[0].costPrice ?? 0);
      }
    }

    return {
      variantId: variant ? Number(variant.id) : null,
      stockCardId: stockCard ? Number(stockCard.id) : null,
      productId: stockCard ? null : productId,
      unitCost: stockCard
        ? Number(stockCard.manualUnitCostEnabled ? stockCard.manualUnitCost : stockCard.automaticUnitCost)
        : productCostPrice,
    };
  }

  private async hasUnmatchedItems(order: ExternalOrder) {
    for (const item of order.items) {
      const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM stock_cards
        WHERE (${item.barcode ?? ''} <> '' AND barcode = ${item.barcode ?? ''})
          OR (${item.modelCode ?? ''} <> '' AND (sku = ${item.modelCode ?? ''} OR old_model_code = ${item.modelCode ?? ''} OR model = ${item.modelCode ?? ''}))
        LIMIT 1
      `;
      if (!rows[0]) return true;
    }
    return false;
  }

  private async returnSaleStockTx(tx: Prisma.TransactionClient, saleId: number, userId: number) {
    const items = await tx.$queryRaw<Array<{ id: number; stock_card_id: number | null; quantity: number; unit: string | null }>>`
      SELECT id, stock_card_id, quantity, (SELECT unit FROM stock_cards WHERE id = stock_card_id) AS unit
      FROM retail_sale_items
      WHERE sale_id = ${saleId} AND stock_fulfillment_type = 'READY_STOCK' AND stock_card_id IS NOT NULL
    `;
    for (const item of items) {
      const stockCardId = item.stock_card_id!;
      const eventKey = `SALE_STOCK_RETURN:${saleId}:${item.id}`;
      const already = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM stock_movements WHERE event_key = ${eventKey} LIMIT 1
      `;
      if (already.length > 0) continue;
      await tx.$queryRaw`SELECT id FROM stock_cards WHERE id = ${stockCardId} FOR UPDATE`;
      const cards = await tx.$queryRaw<Array<{ sq: number }>>`
        SELECT stock_quantity AS sq FROM stock_cards WHERE id = ${stockCardId}
      `;
      const prev = Number(cards[0]?.sq ?? 0);
      const next = prev + Number(item.quantity);
      await tx.$executeRaw`
        UPDATE stock_cards SET stock_quantity = ${next}, last_movement_at = NOW(), updated_at = NOW()
        WHERE id = ${stockCardId}
      `;
      await tx.$executeRaw`
        INSERT INTO stock_movements (stock_card_id, type, quantity, unit, previous_stock, next_stock, reason, reference_type, reference_id, event_key, created_by_id, created_at)
        VALUES (${stockCardId}, 'IN', ${Number(item.quantity)}, ${item.unit ?? 'Adet'}, ${prev}, ${next}, 'RETURN', 'RETAIL_SALE', ${String(saleId)}, ${eventKey}, ${userId}, NOW())
        ON CONFLICT (event_key) DO NOTHING
      `;
    }
  }

  private async ensureCustomer(tx: Prisma.TransactionClient, order: ExternalOrder, userId: number) {
    const normalizedPhone = this.normalizePhone(order.phone);
    if (normalizedPhone) {
      const existing = await tx.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id FROM retail_customers WHERE normalized_phone = ${normalizedPhone} LIMIT 1
      `;
      if (existing[0]) return existing[0];
    }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(19010101)`;
    const next = await tx.$queryRaw<Array<{ nextId: number }>>`SELECT COALESCE(MAX(id), 0) + 1 AS "nextId" FROM retail_customers`;
    const customerCode = `MUS-${String(Number(next[0].nextId)).padStart(6, '0')}`;
    const phone = this.text(order.phone) || null;
    const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO retail_customers (
        customer_code, customer_type, first_name, display_name, phone, normalized_phone, whatsapp_phone,
        source, order_communication_allowed, created_by_id, created_at, updated_at
      )
      VALUES (${customerCode}, 'INDIVIDUAL', ${order.customerName}, ${order.customerName}, ${phone}, ${normalizedPhone}, ${phone},
        ${order.platform}::"RetailSaleChannel", true, ${userId}, NOW(), NOW())
      RETURNING id
    `;
    return rows[0];
  }

  private async ensureAddress(tx: Prisma.TransactionClient, customerId: number, order: ExternalOrder, userId: number) {
    const fullAddress = this.text(order.addressText) || 'Platform sipariş adresi';
    const existing = await tx.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id FROM retail_customer_addresses
      WHERE customer_id = ${customerId} AND full_address = ${fullAddress} AND is_active = true
      LIMIT 1
    `;
    if (existing[0]) return existing[0];
    const rows = await tx.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO retail_customer_addresses (
        customer_id, title, recipient_name, recipient_phone, city, district, full_address, is_default, created_by_id, created_at, updated_at
      )
      VALUES (${customerId}, 'Platform', ${order.customerName}, ${order.phone}, ${order.city ?? null}, ${order.district ?? null}, ${fullAddress}, false, ${userId}, NOW(), NOW())
      RETURNING id
    `;
    return rows[0];
  }

  private async nextSaleNumber(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(17001703)`;
    const year = new Date().getFullYear();
    const rows = await tx.$queryRaw<Array<{ nextNo: number }>>`
      SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 9) AS integer)), 0) + 1 AS "nextNo"
      FROM retail_sales
      WHERE sale_number ~ ${`^EF-${year}-[0-9]{6}$`}
    `;
    return `EF-${year}-${String(Number(rows[0]?.nextNo ?? 1)).padStart(6, '0')}`;
  }

  private orderTotals(order: ExternalOrder) {
    const subtotal = this.roundMoney(order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0));
    const grandTotal = this.roundMoney(order.totalAmount || subtotal);
    const paidTotal = order.paymentStatus === 'WAITING' ? 0 : this.roundMoney(order.paidAmount ?? grandTotal);
    return { subtotal, grandTotal, paidTotal, remainingTotal: this.roundMoney(Math.max(0, grandTotal - paidTotal)) };
  }

  private async ensureConnectionRows() {
    for (const item of platforms) {
      await this.prisma.$executeRaw`
        INSERT INTO integration_connections (platform, display_name, status, uses_env_credentials, created_at, updated_at)
        VALUES (${item.platform}, ${item.displayName}, 'NOT_CONFIGURED', ${item.platform !== TICIMAX_PLATFORM}, NOW(), NOW())
        ON CONFLICT (platform) DO NOTHING
      `;
    }
  }

  private async ensureTicimaxSettings(tenant: string) {
    const [row] = await this.prisma.$queryRaw<TicimaxSettingsRow[]>`
      INSERT INTO integration_tenant_settings (
        tenant, platform, site_url, service_endpoint, wsdl_url, status, created_at, updated_at
      )
      VALUES (
        ${tenant}, ${TICIMAX_PLATFORM}, ${TICIMAX_DEFAULTS.siteUrl}, ${TICIMAX_DEFAULTS.serviceEndpoint}, ${TICIMAX_DEFAULTS.wsdlUrl},
        'NOT_CONFIGURED', NOW(), NOW()
      )
      ON CONFLICT (tenant, platform) DO UPDATE SET updated_at = integration_tenant_settings.updated_at
      RETURNING tenant, platform, site_url AS "siteUrl", service_endpoint AS "serviceEndpoint",
        wsdl_url AS "wsdlUrl", secret_value AS "secretValue", status, last_test_at AS "lastTestAt", last_error AS "lastError"
    `;
    await this.upsertConnectionStatus(TICIMAX_PLATFORM, row.status, row.lastError);
    return row;
  }

  private async updateTicimaxTestResult(tenant: string, status: string, lastError: string | null) {
    const [row] = await this.prisma.$queryRaw<TicimaxSettingsRow[]>`
      UPDATE integration_tenant_settings
      SET status = ${status}, last_test_at = NOW(), last_error = ${lastError}, updated_at = NOW()
      WHERE tenant = ${tenant} AND platform = ${TICIMAX_PLATFORM}
      RETURNING tenant, platform, site_url AS "siteUrl", service_endpoint AS "serviceEndpoint",
        wsdl_url AS "wsdlUrl", secret_value AS "secretValue", status, last_test_at AS "lastTestAt", last_error AS "lastError"
    `;
    await this.upsertConnectionStatus(TICIMAX_PLATFORM, status, lastError);
    return row;
  }

  private async upsertConnectionStatus(platform: IntegrationPlatform, status: string, lastError: string | null) {
    await this.prisma.$executeRaw`
      INSERT INTO integration_connections (platform, display_name, status, uses_env_credentials, last_error, created_at, updated_at)
      VALUES (${platform}, ${this.displayName(platform)}, ${status}, ${platform !== TICIMAX_PLATFORM}, ${lastError}, NOW(), NOW())
      ON CONFLICT (platform) DO UPDATE SET status = EXCLUDED.status, last_error = EXCLUDED.last_error, updated_at = NOW()
    `;
  }

  private serializeTicimaxSettings(row: TicimaxSettingsRow) {
    return {
      tenant: row.tenant,
      siteUrl: row.siteUrl ?? TICIMAX_DEFAULTS.siteUrl,
      serviceEndpoint: row.serviceEndpoint ?? TICIMAX_DEFAULTS.serviceEndpoint,
      wsdlUrl: row.wsdlUrl ?? TICIMAX_DEFAULTS.wsdlUrl,
      status: row.status,
      lastTestAt: row.lastTestAt,
      lastError: row.lastError,
      hasUyeKodu: Boolean(row.secretValue),
      uyeKoduMasked: this.maskSecret(row.secretValue),
    };
  }

  private async testWsdlReachability(wsdlUrl: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(wsdlUrl, { method: 'GET', signal: controller.signal });
      const text = await response.text().catch(() => '');
      if (!response.ok) {
        return { ok: false, message: `WSDL adresine erişilemedi. HTTP ${response.status}` };
      }
      const looksLikeWsdl = text.includes('wsdl:definitions') || text.includes('<definitions') || text.includes('UrunServis');
      if (!looksLikeWsdl) {
        return { ok: false, message: 'WSDL adresi yanıt verdi ancak servis tanımı doğrulanamadı.' };
      }
      return { ok: true, message: 'Ticimax WSDL adresine erişildi. Ürün gönderme çağrısı yapılmadı.' };
    } catch (error) {
      return { ok: false, message: error instanceof Error && error.name === 'AbortError' ? 'WSDL bağlantı testi zaman aşımına uğradı.' : 'WSDL bağlantı testi başarısız oldu.' };
    } finally {
      clearTimeout(timeout);
    }
  }

  private encryptSecret(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.secretKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  private decryptSecret(value: string) {
    const [version, ivText, tagText, encryptedText] = value.split(':');
    if (version !== 'v1' || !ivText || !tagText || !encryptedText) return '';
    const decipher = createDecipheriv('aes-256-gcm', this.secretKey(), Buffer.from(ivText, 'base64'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
  }

  private maskSecret(value: string | null) {
    if (!value) return '';
    try {
      const decrypted = this.decryptSecret(value);
      if (!decrypted) return '••••';
      return `•••• ${decrypted.slice(-4)}`;
    } catch {
      return '••••';
    }
  }

  private secretKey() {
    return createHash('sha256').update(process.env.JWT_SECRET ?? 'local-dev-secret').digest();
  }

  private cleanTenant(value: unknown) {
    return this.text(value) || TICIMAX_DEFAULTS.tenant;
  }

  private cleanUrl(value: unknown, label: string) {
    const text = this.text(value);
    if (!text) return '';
    try {
      const url = new URL(text);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid protocol');
      return url.toString();
    } catch {
      throw new BadRequestException(`${label} geçerli bir URL olmalıdır.`);
    }
  }

  async syncTrendyolStockCards(companyCode = 'ERHAN') {
    const creds = await this.integrationCenter.runtimeCredentials('TRENDYOL', companyCode);
    const supplierId = String(creds['SUPPLIER_ID'] ?? '');
    const apiKey     = String(creds['API_KEY']     ?? '');
    const apiSecret  = String(creds['API_SECRET']  ?? '');
    const apiUrl     = String(creds['API_URL']      ?? 'https://api.trendyol.com/sapigw').replace(/\/+$/, '');

    if (!supplierId || !apiKey || !apiSecret) {
      return { ok: false, message: 'Trendyol API bilgileri eksik.' };
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const headers = {
      Authorization: `Basic ${auth}`,
      'User-Agent':  `${supplierId} - SelfIntegration`,
      Accept:        'application/json',
    };

    let page = 0;
    let totalPages = 1;
    let created = 0;
    let updated = 0;

    while (page < totalPages) {
      const url = `${apiUrl}/product/sellers/${supplierId}/products?approved=true&page=${page}&size=200`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText);
        return { ok: false, message: `Trendyol API hatasi ${res.status}: ${msg}` };
      }
      const data: any = await res.json();
      totalPages = data.totalPages ?? 1;
      const items: any[] = data.content ?? [];

      for (const item of items) {
        const barcode  = item.barcode   ? String(item.barcode)   : null;
        const sku      = item.stockCode ? String(item.stockCode) : null;
        const name     = String(item.title ?? item.productName ?? sku ?? barcode ?? 'Trendyol Urun');
        const imageUrl = item.images?.[0]?.url ? String(item.images[0].url) : null;
        const salePrice = Number(item.salePrice ?? item.listPrice ?? 0);
        const brand    = item.brand ? String(item.brand) : null;

        if (!barcode && !sku) continue;

        try {
          const where = sku ? { sku } : { barcode: barcode! };
          const existing = await this.prisma.stockCard.findFirst({ where, select: { id: true, imagePath: true } });

          if (existing) {
            if (imageUrl && !existing.imagePath) {
              await this.prisma.stockCard.update({ where: { id: existing.id }, data: { imagePath: imageUrl } });
              updated++;
            }
          } else {
            await this.prisma.stockCard.create({
              data: {
                name,
                sku:       sku      ?? undefined,
                barcode:   barcode  ?? undefined,
                imagePath: imageUrl ?? undefined,
                brand:     brand    ?? undefined,
                salePrice,
                unit:     'Adet',
                category: 'Trendyol',
              },
            });
            created++;
          }
        } catch { /* skip duplicate */ }
      }

      page++;
      if (page < totalPages) await new Promise(r => setTimeout(r, 200));
    }

    return { ok: true, created, updated, message: `${created} yeni stok karti olusturuldu, ${updated} gorsel guncellendi.` };
  }

  async deleteAllProducts(platform: 'N11' | 'HEPSIBURADA'): Promise<{ deleted: number; failed: number; errors: string[] }> {
    const variants = await this.prisma.$queryRaw<{ barcode: string; model_code: string | null }[]>`
      SELECT barcode, model_code FROM trendyol_product_variants WHERE barcode IS NOT NULL AND barcode <> ''
    `;
    const adapter = await this.adapter(platform as IntegrationPlatform);
    let deleted = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const v of variants) {
      const sku = v.barcode || v.model_code || '';
      if (!sku) continue;
      try {
        let result: { ok: boolean; message?: string };
        if (platform === 'N11') {
          result = await (adapter as N11Adapter).deleteProduct(sku);
        } else {
          result = await (adapter as HepsiburadaAdapter).deleteListing(sku);
        }
        if (result.ok) deleted++;
        else { failed++; if (errors.length < 20) errors.push(`${sku}: ${result.message}`); }
      } catch (e) {
        failed++;
        if (errors.length < 20) errors.push(`${sku}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return { deleted, failed, errors };
  }

  // Mağazanın Trendyol bağlantısını şifreleri göstermeden teşhis eder:
  // hangi Satıcı ID / anahtarın kullanıldığı (maskeli) ve sipariş + ürün uç noktalarının cevabı.
  async diagnoseTrendyolStore(companyValue?: string) {
    const companyCode = this.text(companyValue).toUpperCase() || 'ERHAN';
    if (!['ERHAN', 'FLORA'].includes(companyCode)) throw new BadRequestException('Mağaza ERHAN veya FLORA olmalıdır.');
    let creds: Record<string, string>;
    try {
      creds = companyCode === 'ERHAN'
        ? await this.integrationCenter.runtimeCredentials('TRENDYOL', 'ERHAN')
        : await this.integrationCenter.storeCredentials('TRENDYOL', companyCode);
    } catch (error) {
      return { ok: false, companyCode, credentials: null, tests: [], message: this.errorMessage(error) };
    }
    const supplierId = this.text(creds.SUPPLIER_ID);
    const mask = (value: unknown) => {
      const raw = String(value ?? '');
      const trimmed = raw.trim();
      return {
        length: raw.length,
        preview: trimmed ? `${trimmed.slice(0, 2)}…${trimmed.slice(-4)}` : '(boş)',
        hasSpaces: raw !== trimmed || /\s/.test(trimmed),
      };
    };
    const apiBase = String(creds.API_URL || process.env.TRENDYOL_API_URL || 'https://api.trendyol.com/sapigw').replace(/\/+$/, '');
    const headers = {
      Authorization: `Basic ${Buffer.from(`${creds.API_KEY ?? ''}:${creds.API_SECRET ?? ''}`).toString('base64')}`,
      'User-Agent': `${supplierId} - SelfIntegration`,
      Accept: 'application/json',
    };
    const probe = async (name: string, url: string) => {
      try {
        const response = await fetch(url, { headers });
        const body = response.ok ? '' : (await response.text().catch(() => '')).slice(0, 300);
        return { name, ok: response.ok, status: response.status, message: response.ok ? 'Başarılı' : body };
      } catch (error) {
        return { name, ok: false, status: 0, message: this.errorMessage(error) };
      }
    };
    const now = Date.now();
    const tests = [
      await probe('Sipariş okuma', `${apiBase}/order/sellers/${supplierId}/v2/orders?size=1&page=0&startDate=${now - 86_400_000}&endDate=${now}`),
      await probe('Ürün okuma', `${apiBase}/product/sellers/${supplierId}/products?size=1&page=0`),
    ];
    return {
      ok: tests.every((test) => test.ok),
      companyCode,
      apiBase,
      credentials: { supplierId, apiKey: mask(creds.API_KEY), apiSecret: mask(creds.API_SECRET) },
      tests,
    };
  }

  /**
   * Ciro raporu: siparişleri doğrudan platformdan çeker (Trendyol + n11, Erhan ve Flora mağazaları).
   * İptal / iade / teslim edilemeyen hariç. Gün = Türkiye saatine göre sipariş tarihi.
   * Bir mağaza hata verirse o kanal `ok:false` döner (rapor o kanalda ERP kaydına düşer).
   */
  async platformRevenue(from: string, to: string) {
    const startMs = new Date(`${from}T00:00:00+03:00`).getTime();
    const endMs = Math.min(new Date(`${to}T23:59:59.999+03:00`).getTime(), Date.now());
    const trDay = (d: Date) => new Date(d.getTime() + 3 * 3600000).toISOString().slice(0, 10);
    const stores: Array<{ channel: string; platform: IntegrationPlatform; company: 'ERHAN' | 'FLORA' }> = [
      { channel: 'TRENDYOL', platform: 'TRENDYOL', company: 'ERHAN' },
      { channel: 'TRENDYOL_FLORA', platform: 'TRENDYOL', company: 'FLORA' },
      { channel: 'N11', platform: 'N11', company: 'ERHAN' },
      { channel: 'N11_FLORA', platform: 'N11', company: 'FLORA' },
    ];
    const results: Array<{ channel: string; ok: boolean; error?: string; days: Record<string, { revenue: number; orders: number }> }> = [];
    for (const st of stores) {
      try {
        // Flora: mağazaya özel bilgi zorunlu (Erhan bilgilerine düşüp Erhan cirosunu Flora diye saymasın)
        const adapter = (st.company === 'ERHAN' ? await this.adapter(st.platform) : await this.storeAdapter(st.platform, st.company)) as unknown as {
          fetchOrdersBetween?: (a: number, b: number) => Promise<ExternalOrder[]>;
        };
        if (typeof adapter.fetchOrdersBetween !== 'function') throw new Error('Tarih aralığıyla sipariş çekme desteklenmiyor');
        const orders = await adapter.fetchOrdersBetween(startMs, endMs);
        const days: Record<string, { revenue: number; orders: number }> = {};
        for (const o of orders) {
          if (o.status === 'CANCELLED' || o.invoiceStatus === 'RETURNED' || o.invoiceStatus === 'CANCELLED') continue;
          if (!o.orderDate) continue;
          const day = trDay(o.orderDate);
          if (day < from || day > to) continue;
          const d = (days[day] ??= { revenue: 0, orders: 0 });
          d.revenue += Number(o.totalAmount) || 0;
          d.orders += 1;
        }
        results.push({ channel: st.channel, ok: true, days });
      } catch (error) {
        results.push({ channel: st.channel, ok: false, error: this.errorMessage(error), days: {} });
      }
    }
    return results;
  }

  /**
   * Hakedişler: Trendyol cari hesap ekstresi (Erhan + Flora). Satış/iade/indirim kayıtları + ödemeler + kesinti faturaları.
   * Satış (Sale) alınamazsa mağaza hatalı sayılır; diğer tipler alınamazsa uyarı olarak eklenir.
   */
  async platformSettlements(from: string, to: string) {
    const startMs = new Date(`${from}T00:00:00+03:00`).getTime();
    const endMs = Math.min(new Date(`${to}T23:59:59.999+03:00`).getTime(), Date.now());
    const todayIso = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
    const stores: Array<{ channel: string; company: 'ERHAN' | 'FLORA'; label: string }> = [
      { channel: 'TRENDYOL', company: 'ERHAN', label: 'Trendyol · Erhan Flowers' },
      { channel: 'TRENDYOL_FLORA', company: 'FLORA', label: 'Trendyol · Flora' },
    ];
    const out: Array<{ channel: string; label: string; ok: boolean; error?: string; warnings: string[]; summary?: SettlementSummary }> = [];
    for (const st of stores) {
      const warnings: string[] = [];
      try {
        const adapter = (st.company === 'ERHAN' ? await this.adapter('TRENDYOL') : await this.storeAdapter('TRENDYOL', st.company)) as unknown as {
          fetchFinance?: (k: 'settlements' | 'otherfinancials', t: string, a: number, b: number) => Promise<Array<Record<string, any>>>;
        };
        if (typeof adapter.fetchFinance !== 'function') throw new Error('Finans servisi desteklenmiyor');
        const settlements = await adapter.fetchFinance('settlements', 'Sale', startMs, endMs);
        for (const t of ['Return', 'Discount', 'DiscountCancel', 'Coupon', 'CouponCancel', 'ProvisionPositive', 'ProvisionNegative']) {
          try { settlements.push(...(await adapter.fetchFinance('settlements', t, startMs, endMs))); }
          catch (e) { if (t === 'Return') warnings.push(`İadeler alınamadı: ${this.errorMessage(e).slice(0, 120)}`); }
        }
        let payments: Array<Record<string, any>> = [];
        try { payments = await adapter.fetchFinance('otherfinancials', 'PaymentOrder', startMs, endMs); }
        catch (e) { warnings.push(`Ödemeler alınamadı: ${this.errorMessage(e).slice(0, 120)}`); }
        let deductions: Array<Record<string, any>> = [];
        try { deductions = await adapter.fetchFinance('otherfinancials', 'DeductionInvoices', startMs, endMs); }
        catch (e) { warnings.push(`Kesinti faturaları alınamadı: ${this.errorMessage(e).slice(0, 120)}`); }
        out.push({ channel: st.channel, label: st.label, ok: true, warnings, summary: summarizeSettlements(settlements, payments, deductions, todayIso) });
      } catch (error) {
        out.push({ channel: st.channel, label: st.label, ok: false, error: this.errorMessage(error), warnings });
      }
    }
    return out;
  }

  private async storeAdapter(platform: IntegrationPlatform, companyCode: string): Promise<IntegrationAdapter> {
    const credentials = await this.integrationCenter.storeCredentials(platform, companyCode);
    if (platform === 'TRENDYOL') return new TrendyolAdapter(credentials);
    if (platform === 'HEPSIBURADA') return new HepsiburadaAdapter(credentials);
    if (platform === 'N11') return new N11Adapter(credentials);
    if (platform === 'TRENDRUM') return new TrendrumAdapter(credentials);
    throw new BadRequestException(`${platform} için mağaza seçimi desteklenmiyor.`);
  }

  private async adapter(platform: IntegrationPlatform, companyCode = 'ERHAN'): Promise<IntegrationAdapter> {
    if (platform === 'TRENDYOL') return new TrendyolAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'HEPSIBURADA') return new HepsiburadaAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'N11') return new N11Adapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'TICIMAX') return new TicimaxAdapter(await this.integrationCenter.ticimaxRuntimeCredentials());
    if (platform === 'TRENDRUM') return new TrendrumAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'PAZARAMA') return new PazaramaAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'IDEFIX') return new IdefixAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'KOCTAS') return new KoctasAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    if (platform === 'AMAZON') return new AmazonAdapter(await this.integrationCenter.runtimeCredentials(platform, companyCode));
    return new GenericMarketplaceAdapter(platform);
  }

  private platform(value: string): IntegrationPlatform {
    const text = this.text(value).toUpperCase();
    if (platforms.some((item) => item.platform === text)) return text as IntegrationPlatform;
    throw new BadRequestException('Platform desteklenmiyor.');
  }

  private displayName(platform: IntegrationPlatform) {
    return platforms.find((item) => item.platform === platform)?.displayName ?? platform;
  }

  private async log(platform: string, action: string, status: string, message: string, externalOrderId?: string | null, saleId?: number | null, payloadSummary?: unknown) {
    await this.prisma.$executeRaw`
      INSERT INTO integration_sync_logs (platform, action, status, message, external_order_id, sale_id, completed_at, payload_summary)
      VALUES (${platform}, ${action}, ${status}, ${message}, ${externalOrderId ?? null}, ${saleId ?? null}, NOW(), ${payloadSummary ? JSON.stringify(payloadSummary) : null}::jsonb)
    `;
  }

  private normalizePhone(value: unknown) {
    let digits = this.text(value).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('0090')) digits = digits.slice(4);
    if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
    if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    if (digits.length === 10) return `90${digits}`;
    return digits;
  }

  private text(value: unknown) {
    return String(value ?? '').trim();
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Siparis ice aktarilamadi.';
  }

  private roundMoney(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  async fetchTrendyolProducts(): Promise<Array<Record<string, unknown>>> {
    const adapter = await this.adapter('TRENDYOL', 'ERHAN') as TrendyolAdapter;
    return adapter.fetchSellerProducts(100);
  }
}
