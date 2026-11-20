import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateInstallmentDebt = {
  title: string;
  creditor?: string;
  supplierId?: number | null;
  totalAmount: number;
  installmentCount: number;
  /** İlk taksitin vade tarihi (YYYY-MM-DD) */
  startDate: string;
  documentNo?: string;
  notes?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Ay ekle; gün o ayda yoksa ayın son gününe çek (31 Ocak → 28/29 Şubat). */
export function addMonthsClamped(base: Date, months: number) {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + months;
  const day = base.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, lastDay)));
}

@Injectable()
export class InstallmentDebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const debts = await this.prisma.installmentDebt.findMany({
      include: {
        installments: { orderBy: { no: 'asc' } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ isClosed: 'asc' }, { startDate: 'asc' }],
    });
    return debts.map((d) => this.withTotals(d));
  }

  async get(id: number) {
    const d = await this.prisma.installmentDebt.findUnique({
      where: { id },
      include: { installments: { orderBy: { no: 'asc' } }, supplier: { select: { id: true, name: true } } },
    });
    if (!d) throw new NotFoundException('Taksitli borç bulunamadı.');
    return this.withTotals(d);
  }

  async create(body: CreateInstallmentDebt) {
    const title = body.title?.trim();
    const total = Number(body.totalAmount);
    const count = Math.floor(Number(body.installmentCount));
    if (!title) throw new BadRequestException('Borç adı zorunludur.');
    if (!total || total <= 0) throw new BadRequestException('Toplam tutar 0\'dan büyük olmalıdır.');
    if (!count || count < 1 || count > 120) throw new BadRequestException('Taksit sayısı 1-120 arasında olmalıdır.');
    if (!body.startDate) throw new BadRequestException('İlk taksit tarihi zorunludur.');
    const start = new Date(`${body.startDate.slice(0, 10)}T00:00:00Z`);
    if (isNaN(start.getTime())) throw new BadRequestException('Geçersiz tarih.');

    // Eşit taksit; kuruş farkı son taksite eklenir
    const per = round2(total / count);
    const installments = Array.from({ length: count }, (_, i) => ({
      no: i + 1,
      dueDate: addMonthsClamped(start, i),
      amount: i === count - 1 ? round2(total - per * (count - 1)) : per,
    }));

    const created = await this.prisma.installmentDebt.create({
      data: {
        title,
        creditor: body.creditor?.trim() || null,
        supplierId: body.supplierId ? Number(body.supplierId) : null,
        totalAmount: total,
        installmentCount: count,
        startDate: start,
        documentNo: body.documentNo?.trim() || null,
        notes: body.notes?.trim() || null,
        installments: { create: installments },
      },
    });
    return this.get(created.id);
  }

  async update(id: number, body: { title?: string; creditor?: string; documentNo?: string; notes?: string; isClosed?: boolean }) {
    await this.get(id);
    await this.prisma.installmentDebt.update({
      where: { id },
      data: {
        title: body.title?.trim() || undefined,
        creditor: body.creditor !== undefined ? body.creditor.trim() || null : undefined,
        documentNo: body.documentNo !== undefined ? body.documentNo.trim() || null : undefined,
        notes: body.notes !== undefined ? body.notes.trim() || null : undefined,
        isClosed: body.isClosed,
      },
    });
    return this.get(id);
  }

  async remove(id: number) {
    await this.get(id);
    await this.prisma.installmentDebt.delete({ where: { id } });
    return { deleted: true };
  }

  /** Taksiti ödendi işaretle / geri al. */
  async togglePay(installmentId: number, body: { amount?: number; date?: string; note?: string }) {
    const inst = await this.prisma.debtInstallment.findUnique({ where: { id: installmentId } });
    if (!inst) throw new NotFoundException('Taksit bulunamadı.');
    if (inst.paidAt) {
      await this.prisma.debtInstallment.update({
        where: { id: installmentId },
        data: { paidAt: null, paidAmount: null },
      });
    } else {
      await this.prisma.debtInstallment.update({
        where: { id: installmentId },
        data: {
          paidAt: body.date ? new Date(body.date) : new Date(),
          paidAmount: body.amount && body.amount > 0 ? body.amount : inst.amount,
          note: body.note ?? inst.note,
        },
      });
    }
    await this.refreshClosed(inst.installmentDebtId);
    return this.get(inst.installmentDebtId);
  }

  /** Tek taksitin tutarını / vadesini düzelt. */
  async updateInstallment(installmentId: number, body: { amount?: number; dueDate?: string; note?: string }) {
    const inst = await this.prisma.debtInstallment.findUnique({ where: { id: installmentId } });
    if (!inst) throw new NotFoundException('Taksit bulunamadı.');
    if (body.amount !== undefined && !(Number(body.amount) > 0)) throw new BadRequestException('Tutar 0\'dan büyük olmalıdır.');
    await this.prisma.debtInstallment.update({
      where: { id: installmentId },
      data: {
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        dueDate: body.dueDate ? new Date(`${body.dueDate.slice(0, 10)}T00:00:00Z`) : undefined,
        note: body.note,
      },
    });
    // Toplam tutarı taksitlerden yeniden hesapla
    const all = await this.prisma.debtInstallment.findMany({ where: { installmentDebtId: inst.installmentDebtId } });
    await this.prisma.installmentDebt.update({
      where: { id: inst.installmentDebtId },
      data: { totalAmount: round2(all.reduce((s, x) => s + Number(x.amount), 0)) },
    });
    return this.get(inst.installmentDebtId);
  }

  private async refreshClosed(debtId: number) {
    const open = await this.prisma.debtInstallment.count({ where: { installmentDebtId: debtId, paidAt: null } });
    await this.prisma.installmentDebt.update({ where: { id: debtId }, data: { isClosed: open === 0 } });
  }

  private withTotals<T extends { installments: { amount: any; paidAt: Date | null; paidAmount: any; dueDate: Date }[] }>(d: T) {
    const paid = d.installments.filter((i) => i.paidAt).reduce((s, i) => s + Number(i.paidAmount ?? i.amount), 0);
    const remaining = d.installments.filter((i) => !i.paidAt).reduce((s, i) => s + Number(i.amount), 0);
    const next = d.installments.find((i) => !i.paidAt) ?? null;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const overdueCount = d.installments.filter((i) => !i.paidAt && i.dueDate < today).length;
    return {
      ...d,
      paidAmount: round2(paid),
      remainingAmount: round2(remaining),
      paidCount: d.installments.filter((i) => i.paidAt).length,
      overdueCount,
      nextInstallment: next,
    };
  }
}
