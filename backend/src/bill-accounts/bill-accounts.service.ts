import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GmailOrderService } from '../integrations/services/gmail-order.service';
import { extractSubscriberNo, guessBillType, isBillLikeSms, parseBillEmail, ParsedBill } from './bill-email-parser';

const SMS_TOKEN_KEY = 'bill_sms_token';
const SMS_LOG_KEY = 'bill_sms_log';

export type SmsLogEntry = {
  at: string; channel?: 'SMS' | 'EMAIL'; ref?: string; from: string | null; text: string; matched: string | null; amount: number | null; dueDate: string | null; result: string;
  /** Hesapla eşleşmeyen fatura SMS'i için öneri ("Hesap olarak ekle") */
  suggestion?: { subscriberNo: string | null; type: string; provider: string | null } | null;
};

export const BILL_TYPES = ['RENT', 'WATER', 'ELECTRICITY', 'NATURAL_GAS', 'MOBILE', 'INTERNET', 'CREDIT_CARD', 'OTHER'];

type AccountInput = {
  type?: string;
  name?: string;
  dueDay?: number;
  statementDay?: number | null;
  estimatedAmount?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  provider?: string | null;
  subscriberNo?: string | null;
  emailSender?: string | null;
};

/** Hesaptaki numaralar (virgül, noktalı virgül veya / ile birden fazla). */
function accountNumbers(subscriberNo: string | null) {
  return (subscriberNo ?? '').split(/[,;/]+/).map((x) => x.replace(/\s+/g, '')).filter((x) => x.length >= 4);
}

const clean = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);

@Injectable()
export class BillAccountsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BillAccountsService.name);

  constructor(
    private prisma: PrismaService,
    private gmail: GmailOrderService,
  ) {}

  /**
   * Tek seferlik hesap kayıtları (Dükkan 1 / Dükkan 2 / Ev) + ekran görüntülerinden alınan faturalar.
   * Her blok `app_settings` bayrağıyla bir kez çalışır — sonradan silinen/düzenlenen hesap geri gelmez.
   */
  async onApplicationBootstrap() {
    await this.seedOnce('seed_ck_electric_v1', 'ELECTRICITY', 'CK Akdeniz', 26, [
      { name: 'Dükkan 1 – Elektrik', subscriberNo: '4577106676', sortOrder: 1 },
      { name: 'Dükkan 2 – Elektrik', subscriberNo: '8145873522', sortOrder: 2 },
      { name: 'Ev – Elektrik', subscriberNo: null, sortOrder: 3 },
    ]);
    await this.seedOnce('seed_asat_water_v1', 'WATER', 'ASAT', 12, [
      { name: 'Dükkan 1 – Su', subscriberNo: '1002112893', sortOrder: 11 },
      { name: 'Dükkan 2 – Su', subscriberNo: '1002112894', sortOrder: 12 },
      { name: 'Ev – Su', subscriberNo: null, sortOrder: 13 },
    ]);
    // Kullanıcının gönderdiği CK sayfası / CK e-postası+SMS / ASAT SMS'indeki faturalar
    await this.seedBillsOnce('seed_initial_bills_v1', [
      { subscriberNo: '4577106676', year: 2026, month: 11, amount: 435, dueDate: '2026-11-26', note: 'CK online işlemler ekranından' },
      { subscriberNo: '8145873522', year: 2026, month: 10, amount: 2130, dueDate: null, note: 'CK borç bildirimi (e-posta 30.10.2026 + SMS): ödenmemiş 1 adet fatura toplamı' },
      { subscriberNo: '1002112893', year: 2026, month: 10, amount: 328.54, dueDate: '2026-10-12', note: 'ASAT SMS: son ödemesi gecikmiş fatura' },
    ]);
  }

  private async seedOnce(
    flag: string, type: string, provider: string, dueDay: number,
    seeds: Array<{ name: string; subscriberNo: string | null; sortOrder: number }>,
  ) {
    try {
      if (await this.getSetting(flag)) return;
      const existing = await this.prisma.billAccount.findMany({ where: { isActive: true } });

      // Daha önce birden fazla numara tek hesaba girildiyse: o hesabı ilk numaranın hesabına çevir (geçmiş korunur)
      const firstNo = seeds[0].subscriberNo!;
      const combined = existing.find((a) => {
        const nos = accountNumbers(a.subscriberNo);
        return nos.length > 1 && nos.includes(firstNo);
      });
      if (combined) {
        await this.prisma.billAccount.update({
          where: { id: combined.id },
          data: { name: seeds[0].name, subscriberNo: firstNo, type, provider, sortOrder: seeds[0].sortOrder },
        });
        combined.subscriberNo = firstNo;
        combined.name = seeds[0].name;
      }

      for (const sd of seeds) {
        const has = existing.some((a) =>
          a.name === sd.name || (sd.subscriberNo && accountNumbers(a.subscriberNo).includes(sd.subscriberNo)));
        if (has) continue;
        await this.prisma.billAccount.create({
          data: { type, name: sd.name, provider, subscriberNo: sd.subscriberNo, dueDay, sortOrder: sd.sortOrder },
        });
      }
      await this.setSetting(flag, new Date().toISOString());
      this.logger.log(`${provider} fatura hesapları kontrol edildi (${flag})`);
    } catch (err) {
      this.logger.error(`${flag} hatası`, err instanceof Error ? err.message : String(err));
    }
  }

  private async seedBillsOnce(
    flag: string,
    bills: Array<{ subscriberNo: string; year: number; month: number; amount: number; dueDate: string | null; note: string }>,
  ) {
    try {
      if (await this.getSetting(flag)) return;
      const accounts = await this.prisma.billAccount.findMany({ where: { isActive: true } });
      for (const b of bills) {
        const acc = accounts.find((a) => accountNumbers(a.subscriberNo).includes(b.subscriberNo));
        if (!acc) continue;
        const key = { billAccountId_year_month: { billAccountId: acc.id, year: b.year, month: b.month } };
        const ex = await this.prisma.billPayment.findUnique({ where: key });
        if (ex?.paidAt || ex?.amount != null) continue; // ödenmiş ya da zaten tutarı girilmiş
        const data = {
          amount: b.amount,
          dueDate: b.dueDate ? new Date(`${b.dueDate}T00:00:00Z`) : null,
          note: b.note,
          source: 'MANUAL',
        };
        await this.prisma.billPayment.upsert({ where: key, create: { billAccountId: acc.id, year: b.year, month: b.month, ...data }, update: data });
      }
      await this.setSetting(flag, new Date().toISOString());
    } catch (err) {
      this.logger.error(`${flag} hatası`, err instanceof Error ? err.message : String(err));
    }
  }

  async list() {
    return this.prisma.billAccount.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { type: 'asc' }, { name: 'asc' }],
      include: {
        payments: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 14 },
      },
    });
  }

  async create(data: AccountInput) {
    if (!data.name?.trim()) throw new BadRequestException('Hesap adı zorunludur.');
    if (!data.type || !BILL_TYPES.includes(data.type)) throw new BadRequestException('Geçersiz fatura tipi.');
    const dueDay = Number(data.dueDay);
    if (!(dueDay >= 1 && dueDay <= 31)) throw new BadRequestException('Son ödeme günü 1-31 arası olmalı.');
    return this.prisma.billAccount.create({
      data: {
        type: data.type,
        name: data.name.trim(),
        dueDay,
        statementDay: data.statementDay ?? null,
        estimatedAmount: data.estimatedAmount ?? null,
        sortOrder: data.sortOrder ?? 0,
        provider: clean(data.provider) ?? null,
        subscriberNo: clean(data.subscriberNo) ?? null,
        emailSender: clean(data.emailSender) ?? null,
      },
    });
  }

  async update(id: number, data: AccountInput) {
    if (data.type !== undefined && !BILL_TYPES.includes(data.type)) throw new BadRequestException('Geçersiz fatura tipi.');
    return this.prisma.billAccount.update({
      where: { id },
      data: {
        type: data.type,
        name: data.name?.trim() || undefined,
        dueDay: data.dueDay !== undefined ? Number(data.dueDay) : undefined,
        statementDay: data.statementDay,
        estimatedAmount: data.estimatedAmount,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        provider: clean(data.provider),
        subscriberNo: clean(data.subscriberNo),
        emailSender: clean(data.emailSender),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.billAccount.update({ where: { id }, data: { isActive: false } });
  }

  /** O ayın faturasını elle gir (tutar, fatura no, son ödeme tarihi). */
  async setMonthBill(
    billAccountId: number,
    body: { year: number; month: number; amount?: number | null; invoiceNo?: string | null; dueDate?: string | null; note?: string | null },
  ) {
    const { year, month } = body;
    if (!year || !month || month < 1 || month > 12) throw new BadRequestException('Geçersiz ay.');
    const account = await this.prisma.billAccount.findUnique({ where: { id: billAccountId } });
    if (!account) throw new NotFoundException('Hesap bulunamadı.');
    const data = {
      amount: body.amount != null && body.amount !== ('' as unknown) ? Number(body.amount) : null,
      invoiceNo: clean(body.invoiceNo) ?? null,
      dueDate: body.dueDate ? new Date(`${body.dueDate.slice(0, 10)}T00:00:00Z`) : null,
      note: clean(body.note) ?? null,
      source: 'MANUAL',
    };
    return this.prisma.billPayment.upsert({
      where: { billAccountId_year_month: { billAccountId, year, month } },
      create: { billAccountId, year, month, ...data },
      update: data,
    });
  }

  /** Ödendi işaretle / geri al. Fatura bilgisi (tutar, no) geri almada korunur. */
  async togglePayment(billAccountId: number, year: number, month: number, amount?: number, note?: string) {
    const key = { billAccountId_year_month: { billAccountId, year, month } };
    const existing = await this.prisma.billPayment.findUnique({ where: key });

    if (existing?.paidAt) {
      return this.prisma.billPayment.update({ where: key, data: { paidAt: null } });
    }

    return this.prisma.billPayment.upsert({
      where: key,
      create: { billAccountId, year, month, paidAt: new Date(), amount: amount ?? null, note: note ?? null, source: 'MANUAL' },
      update: {
        paidAt: new Date(),
        amount: amount ?? undefined,
        note: note ?? undefined,
      },
    });
  }

  async gmailStatus() {
    return this.gmail.getStatus();
  }

  /** Her sabah: abone numarası girilmiş hesaplar için Gmail'deki fatura e-postalarını tara. */
  @Cron('20 8 * * *')
  async scheduledEmailScan() {
    try {
      const r = await this.scanEmails();
      if (r.updated) this.logger.log(`Fatura e-postası taraması: ${r.updated} fatura güncellendi`);
    } catch (err) {
      this.logger.error('Fatura e-postası taraması hatası', err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Gmail'de abone/tesisat numarasını içeren son 45 günün e-postalarını bulur,
   * tutar / son ödeme tarihi / fatura no'yu çıkarıp ilgili ayın kaydına yazar.
   * Elle girilmiş (MANUAL) veya ödenmiş kayıtlara dokunmaz.
   */
  async scanEmails(accountId?: number) {
    const status = await this.gmail.getStatus();
    if (!status.connected) {
      return { connected: false, scanned: 0, updated: 0, results: [] as Array<Record<string, unknown>> };
    }

    const accounts = await this.prisma.billAccount.findMany({
      where: { isActive: true, subscriberNo: { not: null }, ...(accountId ? { id: accountId } : {}) },
    });

    let updated = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const a of accounts) {
      // Birden fazla numara girilebilir (hesap no + sözleşme no): virgül, noktalı virgül veya / ile ayrılmış
      const nos = accountNumbers(a.subscriberNo);
      if (!nos.length) continue;
      const variants = nos.flatMap((n) =>
        /^5\d{9}$/.test(n) ? [n, `0${n}`, `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`] : [n]);
      const numQ = variants.length === 1 ? `"${variants[0]}"` : `{${variants.map((n) => `"${n}"`).join(' ')}}`;
      const q = [numQ, a.emailSender ? `from:${a.emailSender}` : '', 'newer_than:45d'].filter(Boolean).join(' ');
      const ids = await this.gmail.searchMessageIds(q, 6);
      if (!ids?.length) {
        results.push({ accountId: a.id, name: a.name, found: 0 });
        continue;
      }

      const handledMonths = new Set<string>();
      for (const id of ids) {
        // Gmail en yeniden eskiye döner — her ay için en yeni e-posta geçerli
        const already = await this.prisma.billPayment.findFirst({ where: { emailMessageId: id } });
        if (already) {
          handledMonths.add(`${already.year}-${already.month}`);
          continue;
        }
        const msg = await this.gmail.getMessageContent(id);
        if (!msg) continue;
        const parsed = parseBillEmail(msg.text);
        if (!parsed.amount && !parsed.invoiceNo) continue;

        const ref = parsed.dueDate ?? msg.date ?? new Date();
        const year = ref.getUTCFullYear();
        const month = ref.getUTCMonth() + 1;
        const mk = `${year}-${month}`;
        if (handledMonths.has(mk)) continue;
        handledMonths.add(mk);

        const data = await this.applyParsed(a.id, year, month, parsed, 'EMAIL', id, `E-posta: ${msg.subject.slice(0, 120)}`);
        if (!data) continue;
        updated++;
        results.push({ accountId: a.id, name: a.name, year, month, amount: data.amount, invoiceNo: data.invoiceNo, subject: msg.subject });
      }
    }

    const discovered = await this.discoverUnknownBillEmails(accounts);
    return { connected: true, scanned: accounts.length, updated, discovered, results };
  }

  /**
   * Ayrıştırılan faturayı ilgili ayın kaydına yazar. Ödenmiş veya elle (MANUAL) tutar girilmiş aya dokunmaz.
   * sourceRef: e-posta mesaj id'si ya da `sms:<özet>` — aynı kaynak iki kez işlenmez.
   */
  private async applyParsed(billAccountId: number, year: number, month: number, parsed: ParsedBill, source: 'EMAIL' | 'SMS', sourceRef: string, note: string) {
    const key = { billAccountId_year_month: { billAccountId, year, month } };
    const existing = await this.prisma.billPayment.findUnique({ where: key });
    if (existing?.paidAt || (existing?.source === 'MANUAL' && existing.amount != null)) return null;
    const data = {
      amount: parsed.amount ?? existing?.amount ?? null,
      invoiceNo: parsed.invoiceNo ?? existing?.invoiceNo ?? null,
      dueDate: parsed.dueDate ?? existing?.dueDate ?? null,
      source,
      emailMessageId: sourceRef,
      note: existing?.note ?? note,
    };
    await this.prisma.billPayment.upsert({ where: key, create: { billAccountId, year, month, ...data }, update: data });
    return data;
  }

  // ─── SMS (Android yönlendirme uygulaması → webhook) ────────────────────────

  private async getSetting(key: string) {
    return (await this.prisma.appSetting.findUnique({ where: { key } }))?.value ?? null;
  }

  private async setSetting(key: string, value: string) {
    await this.prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  /** SMS adresinin gizli anahtarı (yoksa oluşturur) + son gelen SMS'ler. */
  async smsSettings(regenerate = false) {
    let token = regenerate ? null : await this.getSetting(SMS_TOKEN_KEY);
    if (!token) {
      token = randomBytes(18).toString('hex');
      await this.setSetting(SMS_TOKEN_KEY, token);
    }
    return { token, log: await this.smsLog() };
  }

  async smsLog(): Promise<SmsLogEntry[]> {
    try { return JSON.parse((await this.getSetting(SMS_LOG_KEY)) ?? '[]'); } catch { return []; }
  }

  private async pushSmsLog(e: SmsLogEntry) {
    const log = await this.smsLog();
    log.unshift(e);
    await this.setSetting(SMS_LOG_KEY, JSON.stringify(log.slice(0, 50)));
  }

  /** Telefondan gelen SMS: abone numarası eşleşen hesabın o ayki faturasına yazar. */
  async receiveSms(token: string | undefined, body: unknown) {
    const saved = await this.getSetting(SMS_TOKEN_KEY);
    const ok = !!saved && !!token && token.length === saved.length && timingSafeEqual(Buffer.from(token), Buffer.from(saved));
    if (!ok) throw new UnauthorizedException('Geçersiz anahtar.');

    // Uygulamalar farklı alan adları kullanıyor — hepsini kabul et
    let text = '';
    let from: string | null = null;
    if (typeof body === 'string') text = body;
    else if (body && typeof body === 'object') {
      const b = body as Record<string, unknown>;
      const pick = (...keys: string[]) => keys.map((k) => b[k]).find((v) => typeof v === 'string' && v.trim()) as string | undefined;
      text = pick('text', 'message', 'msg', 'body', 'content', 'sms', 'key') ?? '';
      from = pick('from', 'sender', 'phone', 'number', 'address', 'title') ?? null;
    }
    text = text.trim().slice(0, 2000);
    if (!text) throw new BadRequestException('SMS metni boş.');

    const digits = text.replace(/[^0-9]/g, ' ');
    const accounts = await this.prisma.billAccount.findMany({ where: { isActive: true, subscriberNo: { not: null } } });
    const compact = text.replace(/\s+/g, '').toUpperCase();
    const hasNumber = (n: string) =>
      /^\d+$/.test(n)
        ? new RegExp(`(^|\\D)${n}(\\D|$)`).test(digits) || (n.length >= 10 && text.replace(/\D/g, '').includes(n))
        : compact.includes(n.toUpperCase());
    const account = accounts.find((a) => accountNumbers(a.subscriberNo).some(hasNumber));
    const parsed = parseBillEmail(text);

    // Tüm SMS'ler gelebilir: hesapla eşleşmeyen ve fatura olmayanlar (banka, kod, kargo…) hiç kaydedilmeden atılır
    if (!account && !isBillLikeSms(text)) {
      return { ok: true, matched: null, amount: null, result: 'Fatura SMS\'i değil — yok sayıldı' };
    }

    const entry: SmsLogEntry = {
      at: new Date().toISOString(), from, text: text.slice(0, 400), matched: account?.name ?? null,
      amount: parsed.amount, dueDate: parsed.dueDate?.toISOString() ?? null, result: '',
    };

    if (!account) {
      entry.result = 'Tanınmayan fatura SMS\'i — hesap olarak ekleyin';
      entry.suggestion = { subscriberNo: extractSubscriberNo(text), ...guessBillType(text, from) };
    }
    else if (!parsed.amount && !parsed.invoiceNo) entry.result = 'Tutar okunamadı';
    else {
      const ref = parsed.dueDate ?? new Date();
      const year = ref.getUTCFullYear();
      const month = ref.getUTCMonth() + 1;
      const hash = createHash('sha1').update(text).digest('hex').slice(0, 16);
      const dup = await this.prisma.billPayment.findFirst({ where: { emailMessageId: `sms:${hash}` } });
      if (dup) entry.result = 'Bu SMS daha önce işlendi';
      else {
        const data = await this.applyParsed(account.id, year, month, parsed, 'SMS', `sms:${hash}`, `SMS${from ? ` (${from})` : ''}: ${text.slice(0, 120)}`);
        entry.result = data ? `${month}/${year} faturasına yazıldı` : `${month}/${year} zaten ödendi veya elle girildi — değiştirilmedi`;
      }
    }

    await this.pushSmsLog(entry);
    this.logger.log(`Fatura SMS: ${entry.matched ?? '-'} → ${entry.result}`);
    return { ok: true, matched: entry.matched, amount: entry.amount, result: entry.result };
  }

  /**
   * Hiçbir hesaba ait olmayan fatura e-postalarını bulur (yeni abonelik) → bildirim listesine öneri olarak düşer.
   * Sadece abone/sözleşme numarası + tutar içerenler alınır (pazaryeri/e-arşiv satış faturaları karışmasın).
   */
  private async discoverUnknownBillEmails(accounts: Array<{ subscriberNo: string | null }>) {
    const known = new Set(accounts.flatMap((a) => accountNumbers(a.subscriberNo)));
    // Takip edilen kurumlar: Vodafone (cep), ASAT (su), CK Akdeniz (elektrik), Türk Telekom (internet)
    const q = 'newer_than:10d {from:vodafone.com.tr from:vodafone.net.tr from:asat.gov.tr from:ckenerji.com.tr from:ckakdeniz.com.tr from:turktelekom.com.tr from:ttmail.com.tr from:ttnet.com.tr} {fatura "son ödeme" borç borcunuz tutar}';
    const ids = (await this.gmail.searchMessageIds(q, 25)) ?? [];
    let seenList: string[] = [];
    try { seenList = JSON.parse((await this.getSetting('bill_email_seen')) ?? '[]'); } catch { /* boş */ }
    const seen = new Set(seenList);
    let found = 0;
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      seenList.unshift(id);
      if (await this.prisma.billPayment.findFirst({ where: { emailMessageId: id } })) continue;
      const msg = await this.gmail.getMessageContent(id);
      if (!msg) continue;
      const text = `${msg.subject}\n${msg.text}`;
      const subscriberNo = extractSubscriberNo(text);
      const parsed = parseBillEmail(text);
      const digits = text.replace(/[^0-9]/g, ' ');
      const isKnown = [...known].some((n) => new RegExp(`(^|\\D)${n}(\\D|$)`).test(digits));
      if (isKnown || !subscriberNo || !parsed.amount || !isBillLikeSms(text)) {
        continue;
      }
      found++;
      await this.pushSmsLog({
        at: (msg.date ?? new Date()).toISOString(), channel: 'EMAIL', ref: `mail:${id}`, from: msg.from.slice(0, 80),
        text: `${msg.subject} — ${msg.text.replace(/\s+/g, ' ').slice(0, 300)}`, matched: null,
        amount: parsed.amount, dueDate: parsed.dueDate?.toISOString() ?? null,
        result: 'Tanınmayan fatura e-postası — hesap olarak ekleyin',
        suggestion: { subscriberNo, ...guessBillType(text, msg.from) },
      });
    }
    await this.setSetting('bill_email_seen', JSON.stringify(seenList.slice(0, 400)));
    return found;
  }
}
