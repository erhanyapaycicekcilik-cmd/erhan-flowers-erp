import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { foldTr } from '../bill-accounts/bill-email-parser';
import { parseBankSms } from './bank-sms-parser';

export const BANK_DEBT_KINDS = ['CREDIT_CARD', 'LOAN', 'OVERDRAFT', 'OTHER'] as const;
const BANK_SMS_LOG_KEY = 'bank_sms_log';

type AccountInput = {
  kind?: string;
  bankName?: string;
  name?: string;
  accountNo?: string | null;
  creditLimit?: number | string | null;
  currentDebt?: number | string | null;
  statementDay?: number | string | null;
  dueDay?: number | string;
  monthlyPayment?: number | string | null;
  endDate?: string | null;
  interestRate?: number | string | null;
  notes?: string | null;
  isActive?: boolean;
};

type StatementInput = {
  statementDate?: string | null;
  dueDate: string;
  totalAmount: number | string;
  minimumPayment?: number | string | null;
  note?: string | null;
  /** true → kaydı ödendi olarak oluştur (ekstre girmeden "ödedim") */
  paid?: boolean;
  paidAmount?: number | string | null;
};

export type BankUpcoming = {
  accountId: number;
  statementId: number | null;
  title: string;
  party: string;
  dueDate: Date;
  amount: number | null;
  detail: string | null;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
const dateOnly = (s: string) => {
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) throw new BadRequestException('Geçersiz tarih.');
  return d;
};
const fmtTl = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
/** Ayın `day`. günü; ayda o gün yoksa son gün (UTC tarih) */
const dayOfMonth = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate())));

@Injectable()
export class BankDebtsService {
  private readonly logger = new Logger(BankDebtsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Hesaplar ─────────────────────────────────────────────────────────────

  async list() {
    const accounts = await this.prisma.bankDebtAccount.findMany({
      include: { statements: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 } },
      orderBy: [{ isActive: 'desc' }, { bankName: 'asc' }, { name: 'asc' }],
    });
    const today = this.today();
    const rows = accounts.map((a) => {
      const limit = num(a.creditLimit);
      const debt = num(a.currentDebt);
      const unpaid = a.statements.filter((s) => !s.paidAt).sort((x, y) => x.dueDate.getTime() - y.dueDate.getTime());
      const next = this.expectedDue(a, today);
      // Kalan kredi taksiti (bitiş tarihi + sabit taksit varsa)
      let remainingInstallments: number | null = null;
      if (a.kind === 'LOAN' && a.endDate) {
        const end = a.endDate;
        remainingInstallments = Math.max(0, (end.getUTCFullYear() - next.getUTCFullYear()) * 12 + end.getUTCMonth() - next.getUTCMonth() + 1);
      }
      return {
        ...a,
        creditLimit: limit,
        currentDebt: debt,
        monthlyPayment: num(a.monthlyPayment),
        interestRate: num(a.interestRate),
        statements: a.statements.map((s) => ({
          ...s,
          totalAmount: Number(s.totalAmount),
          minimumPayment: num(s.minimumPayment),
          paidAmount: num(s.paidAmount),
          overdue: !s.paidAt && s.dueDate < today,
        })),
        availableLimit: limit != null && debt != null ? r2(limit - debt) : null,
        usagePercent: limit && debt != null ? Math.round((debt / limit) * 100) : null,
        unpaidTotal: r2(unpaid.reduce((s, x) => s + Number(x.totalAmount), 0)),
        overdueCount: unpaid.filter((s) => s.dueDate < today).length,
        nextDueDate: (unpaid[0]?.dueDate ?? next).toISOString(),
        remainingInstallments,
        remainingLoanEstimate: remainingInstallments != null && a.monthlyPayment ? r2(remainingInstallments * Number(a.monthlyPayment)) : null,
      };
    });
    const active = rows.filter((r) => r.isActive);
    return {
      accounts: rows,
      totals: {
        currentDebt: r2(active.reduce((s, r) => s + (r.currentDebt ?? r.remainingLoanEstimate ?? 0), 0)),
        creditLimit: r2(active.reduce((s, r) => s + (r.kind === 'CREDIT_CARD' ? r.creditLimit ?? 0 : 0), 0)),
        unpaidStatements: r2(active.reduce((s, r) => s + r.unpaidTotal, 0)),
        overdueCount: active.reduce((s, r) => s + r.overdueCount, 0),
      },
    };
  }

  async create(body: AccountInput) {
    return this.prisma.bankDebtAccount.create({ data: this.accountData(body, true) as any });
  }

  async update(id: number, body: AccountInput) {
    await this.getAccount(id);
    const data = this.accountData(body, false);
    if (body.currentDebt !== undefined) (data as any).currentDebtAt = new Date();
    return this.prisma.bankDebtAccount.update({ where: { id }, data: data as any });
  }

  async remove(id: number) {
    await this.getAccount(id);
    await this.prisma.bankDebtAccount.delete({ where: { id } });
    return { deleted: true };
  }

  private async getAccount(id: number) {
    const a = await this.prisma.bankDebtAccount.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Banka hesabı bulunamadı.');
    return a;
  }

  private accountData(b: AccountInput, isCreate: boolean) {
    const out: Record<string, unknown> = {};
    if (isCreate || b.kind !== undefined) {
      const kind = String(b.kind ?? 'CREDIT_CARD');
      if (!(BANK_DEBT_KINDS as readonly string[]).includes(kind)) throw new BadRequestException('Geçersiz tür.');
      out.kind = kind;
    }
    if (isCreate || b.bankName !== undefined) {
      if (!b.bankName?.trim()) throw new BadRequestException('Banka adı zorunludur.');
      out.bankName = b.bankName.trim();
    }
    if (isCreate || b.name !== undefined) {
      const name = b.name?.trim() || (isCreate ? (out.kind === 'LOAN' ? 'Kredi' : out.kind === 'OVERDRAFT' ? 'KMH / Ek Hesap' : 'Kredi Kartı') : '');
      if (!name) throw new BadRequestException('Ad zorunludur.');
      out.name = name;
    }
    if (isCreate || b.dueDay !== undefined) {
      const d = Math.floor(Number(b.dueDay));
      if (!(d >= 1 && d <= 31)) throw new BadRequestException('Son ödeme günü 1-31 arasında olmalıdır.');
      out.dueDay = d;
    }
    if (b.statementDay !== undefined) {
      const d = num(b.statementDay);
      if (d != null && !(d >= 1 && d <= 31)) throw new BadRequestException('Hesap kesim günü 1-31 arasında olmalıdır.');
      out.statementDay = d == null ? null : Math.floor(d);
    }
    if (b.accountNo !== undefined) {
      // Kart numarasının tamamı saklanmaz: 12+ haneli kart no girilirse son 4 hane
      let no = (b.accountNo ?? '').replace(/\s+/g, '').trim();
      if (/^\d{15,19}$/.test(no)) no = no.slice(-4);
      out.accountNo = no || null;
    }
    for (const k of ['creditLimit', 'currentDebt', 'monthlyPayment', 'interestRate'] as const) {
      if (b[k] !== undefined) {
        const v = num(b[k]);
        if (v != null && (!Number.isFinite(v) || v < 0)) throw new BadRequestException('Tutarlar negatif olamaz.');
        out[k] = v;
      }
    }
    if (isCreate && out.currentDebt != null) out.currentDebtAt = new Date();
    if (b.endDate !== undefined) out.endDate = b.endDate ? dateOnly(b.endDate) : null;
    if (b.notes !== undefined) out.notes = b.notes?.trim() || null;
    if (b.isActive !== undefined) out.isActive = !!b.isActive;
    return out;
  }

  // ─── Ekstreler ────────────────────────────────────────────────────────────

  /** Ekstre / dönem borcu gir (son ödeme tarihinin ayına yazılır; aynı ay varsa günceller). */
  async upsertStatement(accountId: number, b: StatementInput, source: 'MANUAL' | 'SMS' = 'MANUAL', sourceRef?: string) {
    await this.getAccount(accountId);
    if (!b.dueDate) throw new BadRequestException('Son ödeme tarihi zorunludur.');
    const due = dateOnly(b.dueDate);
    const total = Number(b.totalAmount);
    if (!(total >= 0) || !Number.isFinite(total)) throw new BadRequestException('Dönem borcu geçersiz.');
    const min = num(b.minimumPayment);
    const year = due.getUTCFullYear();
    const month = due.getUTCMonth() + 1;
    const data = {
      statementDate: b.statementDate ? dateOnly(b.statementDate) : null,
      dueDate: due,
      totalAmount: total,
      minimumPayment: min,
      note: b.note?.trim() || null,
      source,
      sourceRef: sourceRef ?? null,
      ...(b.paid ? { paidAt: new Date(), paidAmount: num(b.paidAmount) ?? total } : {}),
    };
    return this.prisma.bankStatement.upsert({
      where: { accountId_year_month: { accountId, year, month } },
      create: { accountId, year, month, ...data },
      update: data,
    });
  }

  /** Girilmiş ekstreyi düzelt (tutar, asgari, tarihler). */
  async updateStatement(statementId: number, b: Partial<StatementInput>) {
    const s = await this.prisma.bankStatement.findUnique({ where: { id: statementId } });
    if (!s) throw new NotFoundException('Ekstre bulunamadı.');
    const due = b.dueDate ? dateOnly(b.dueDate) : undefined;
    if (b.totalAmount !== undefined && !(Number(b.totalAmount) >= 0)) throw new BadRequestException('Dönem borcu geçersiz.');
    try {
      return await this.prisma.bankStatement.update({
        where: { id: statementId },
        data: {
          dueDate: due,
          year: due ? due.getUTCFullYear() : undefined,
          month: due ? due.getUTCMonth() + 1 : undefined,
          statementDate: b.statementDate !== undefined ? (b.statementDate ? dateOnly(b.statementDate) : null) : undefined,
          totalAmount: b.totalAmount !== undefined ? Number(b.totalAmount) : undefined,
          minimumPayment: b.minimumPayment !== undefined ? num(b.minimumPayment) : undefined,
          note: b.note !== undefined ? b.note?.trim() || null : undefined,
          source: 'MANUAL',
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('Bu hesabın o aya ait başka bir ekstresi var.');
      throw e;
    }
  }

  async togglePay(statementId: number, b: { amount?: number | string; date?: string }) {
    const s = await this.prisma.bankStatement.findUnique({ where: { id: statementId } });
    if (!s) throw new NotFoundException('Ekstre bulunamadı.');
    return this.prisma.bankStatement.update({
      where: { id: statementId },
      data: s.paidAt
        ? { paidAt: null, paidAmount: null }
        : { paidAt: b.date ? dateOnly(b.date) : new Date(), paidAmount: num(b.amount) ?? s.totalAmount },
    });
  }

  async removeStatement(statementId: number) {
    const s = await this.prisma.bankStatement.findUnique({ where: { id: statementId } });
    if (!s) throw new NotFoundException('Ekstre bulunamadı.');
    await this.prisma.bankStatement.delete({ where: { id: statementId } });
    return { deleted: true };
  }

  // ─── Ödeme takvimi (Borçlar → Tüm Borçlar, uyarı şeridi, sabah e-postası) ─

  /**
   * Ödenmemiş ekstreler + ekstresi henüz girilmemiş ayların beklenen son ödeme günleri (geçen ay / bu ay / gelecek ay).
   * Kredi için beklenen tutar = aylık taksit; kart/KMH'de ekstre girilene kadar tutar boş.
   */
  async unpaidForOverview(horizon: Date): Promise<BankUpcoming[]> {
    const today = this.today();
    const accounts = await this.prisma.bankDebtAccount.findMany({
      where: { isActive: true },
      include: { statements: { where: { OR: [{ paidAt: null }, { dueDate: { gte: new Date(today.getTime() - 70 * 86400000) } }] } } },
    });
    const out: BankUpcoming[] = [];
    const label = (a: { kind: string; name: string; accountNo: string | null }) => `${a.name}${a.accountNo ? ` (${a.accountNo.length <= 4 ? `*${a.accountNo}` : a.accountNo})` : ''}`;
    for (const a of accounts) {
      for (const s of a.statements) {
        if (s.paidAt || s.dueDate > horizon) continue;
        const min = num(s.minimumPayment);
        out.push({
          accountId: a.id,
          statementId: s.id,
          title: label(a),
          party: a.bankName,
          dueDate: s.dueDate,
          amount: Number(s.totalAmount),
          detail: [a.kind === 'LOAN' ? 'Kredi taksiti' : 'Ekstre', min != null ? `asgari ${fmtTl(min)}` : null].filter(Boolean).join(' • '),
        });
      }
      const created = new Date(Date.UTC(a.createdAt.getUTCFullYear(), a.createdAt.getUTCMonth(), a.createdAt.getUTCDate()));
      for (let k = -1; k <= 1; k++) {
        const ref = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + k, 1));
        const y = ref.getUTCFullYear();
        const m = ref.getUTCMonth() + 1;
        if (a.statements.some((s) => s.year === y && s.month === m)) continue;
        const due = dayOfMonth(y, m, a.dueDay);
        if (due > horizon || due < created) continue;
        if (a.endDate && due > a.endDate) continue;
        const isLoan = a.kind === 'LOAN';
        out.push({
          accountId: a.id,
          statementId: null,
          title: label(a),
          party: a.bankName,
          dueDate: due,
          amount: isLoan ? num(a.monthlyPayment) : null,
          detail: isLoan ? 'Kredi taksiti (beklenen)' : 'Ekstre bekleniyor — tutar girilmedi',
        });
      }
    }
    return out.sort((x, y) => x.dueDate.getTime() - y.dueDate.getTime());
  }

  // ─── SMS ──────────────────────────────────────────────────────────────────

  /**
   * Telefondan iletilen banka SMS'i (fatura SMS adresiyle aynı uç). Hesapla eşleşirse:
   *  - ekstre/taksit SMS'i → o ayın ekstresi (elle girilmiş veya ödenmiş aya dokunmaz)
   *  - "kullanılabilir limit" → güncel borç = limit − kullanılabilir
   * Banka SMS'i değilse / eşleşmezse null döner (fatura akışı devam eder).
   */
  async receiveSms(text: string, from: string | null): Promise<{ matched: string; result: string; amount: number | null } | null> {
    const p = parseBankSms(text, from);
    if (!p.isStatement && p.availableLimit == null && p.currentDebt == null) return null;
    const accounts = await this.prisma.bankDebtAccount.findMany({ where: { isActive: true } });
    if (!accounts.length) return null;

    const digitsOf = (s: string | null) => (s ?? '').replace(/\D/g, '');
    let account = p.last4
      ? accounts.find((a) => {
          const no = digitsOf(a.accountNo);
          return no.length >= 4 && (no.endsWith(p.last4!) || p.last4!.endsWith(no));
        })
      : undefined;
    if (!account) {
      const allDigits = text.replace(/\D/g, ' ');
      account = accounts.find((a) => {
        const no = digitsOf(a.accountNo);
        return no.length >= 6 && new RegExp(`(^|\\D)${no}(\\D|$)`).test(allDigits);
      });
    }
    if (!account && p.bank) {
      // Bankada tek hesap varsa (ve SMS başka bir kart numarası söylemiyorsa) ona yaz
      const same = accounts.filter((a) => foldTr(a.bankName).includes(foldTr(p.bank!).split(' ')[0]));
      const kindOk = same.filter((a) => (p.isStatement && /kredi(?:niz| taksit)/.test(foldTr(text)) ? a.kind === 'LOAN' : a.kind !== 'LOAN'));
      if (!p.last4 && kindOk.length === 1) account = kindOk[0];
    }
    if (!account) return null;

    const results: string[] = [];
    if (account.creditLimit != null && (p.availableLimit != null || p.currentDebt != null)) {
      const debt = p.currentDebt ?? r2(Number(account.creditLimit) - p.availableLimit!);
      if (debt >= 0) {
        await this.prisma.bankDebtAccount.update({ where: { id: account.id }, data: { currentDebt: debt, currentDebtAt: new Date() } });
        results.push(`güncel borç ${fmtTl(debt)}`);
      }
    } else if (p.currentDebt != null) {
      await this.prisma.bankDebtAccount.update({ where: { id: account.id }, data: { currentDebt: p.currentDebt, currentDebtAt: new Date() } });
      results.push(`güncel borç ${fmtTl(p.currentDebt)}`);
    }

    if (p.isStatement && p.amount) {
      const due = p.dueDate ?? (() => {
        // Son ödeme tarihi yazmıyorsa: hesap kesimden sonraki ilk son ödeme günü
        const base = p.statementDate ?? this.today();
        let d = dayOfMonth(base.getUTCFullYear(), base.getUTCMonth() + 1, account!.dueDay);
        if (d <= base) d = dayOfMonth(base.getUTCFullYear(), base.getUTCMonth() + 2, account!.dueDay);
        return d;
      })();
      const year = due.getUTCFullYear();
      const month = due.getUTCMonth() + 1;
      const hash = `sms:${createHash('sha1').update(text).digest('hex').slice(0, 16)}`;
      const existing = await this.prisma.bankStatement.findUnique({ where: { accountId_year_month: { accountId: account.id, year, month } } });
      if (existing?.sourceRef === hash) results.push('bu SMS daha önce işlendi');
      else if (existing && (existing.paidAt || existing.source === 'MANUAL')) results.push(`${month}/${year} ekstresi elle girilmiş veya ödenmiş — değiştirilmedi`);
      else {
        await this.upsertStatement(account.id, {
          dueDate: due.toISOString().slice(0, 10),
          statementDate: p.statementDate?.toISOString().slice(0, 10) ?? null,
          totalAmount: p.amount,
          minimumPayment: p.minimumPayment,
          note: `SMS${from ? ` (${from})` : ''}: ${text.slice(0, 160)}`,
        }, 'SMS', hash);
        results.push(`${month}/${year} ekstresi yazıldı (${fmtTl(p.amount)})`);
      }
    }
    if (!results.length) return null;

    const result = results.join(', ');
    await this.pushLog({ at: new Date().toISOString(), from, matched: `${account.bankName} — ${account.name}`, text: text.slice(0, 300), result });
    this.logger.log(`Banka SMS: ${account.bankName} ${account.name} → ${result}`);
    return { matched: `${account.bankName} — ${account.name}`, result, amount: p.amount };
  }

  async smsLog() {
    try {
      const row = await this.prisma.appSetting.findUnique({ where: { key: BANK_SMS_LOG_KEY } });
      return JSON.parse(row?.value ?? '[]') as Array<{ at: string; from: string | null; matched: string; text: string; result: string }>;
    } catch { return []; }
  }

  private async pushLog(e: { at: string; from: string | null; matched: string; text: string; result: string }) {
    const log = [e, ...(await this.smsLog())].slice(0, 30);
    const value = JSON.stringify(log);
    await this.prisma.appSetting.upsert({ where: { key: BANK_SMS_LOG_KEY }, create: { key: BANK_SMS_LOG_KEY, value }, update: { value } });
  }

  // ─── yardımcılar ──────────────────────────────────────────────────────────

  private today() {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }

  /** Bugünden itibaren ilk son ödeme günü */
  private expectedDue(a: { dueDay: number }, today: Date) {
    const d = dayOfMonth(today.getUTCFullYear(), today.getUTCMonth() + 1, a.dueDay);
    return d >= today ? d : dayOfMonth(today.getUTCFullYear(), today.getUTCMonth() + 2, a.dueDay);
  }
}
