import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GmailOrderService } from '../integrations/services/gmail-order.service';
import { parseBillEmail } from './bill-email-parser';

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

const clean = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);

@Injectable()
export class BillAccountsService {
  private readonly logger = new Logger(BillAccountsService.name);

  constructor(
    private prisma: PrismaService,
    private gmail: GmailOrderService,
  ) {}

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
      const nos = a.subscriberNo!.split(/[,;/]+/).map((x) => x.replace(/\s+/g, '')).filter((x) => x.length >= 4);
      if (!nos.length) continue;
      const numQ = nos.length === 1 ? `"${nos[0]}"` : `{${nos.map((n) => `"${n}"`).join(' ')}}`;
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

        const key = { billAccountId_year_month: { billAccountId: a.id, year, month } };
        const existing = await this.prisma.billPayment.findUnique({ where: key });
        if (existing?.paidAt || (existing?.source === 'MANUAL' && existing.amount != null)) continue;

        const data = {
          amount: parsed.amount ?? existing?.amount ?? null,
          invoiceNo: parsed.invoiceNo ?? existing?.invoiceNo ?? null,
          dueDate: parsed.dueDate ?? existing?.dueDate ?? null,
          source: 'EMAIL',
          emailMessageId: id,
          note: existing?.note ?? `E-posta: ${msg.subject.slice(0, 120)}`,
        };
        await this.prisma.billPayment.upsert({ where: key, create: { billAccountId: a.id, year, month, ...data }, update: data });
        updated++;
        results.push({ accountId: a.id, name: a.name, year, month, amount: data.amount, invoiceNo: data.invoiceNo, subject: msg.subject });
      }
    }

    return { connected: true, scanned: accounts.length, updated, results };
  }
}
