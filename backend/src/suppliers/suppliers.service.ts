import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async listSuppliers() {
    const suppliers = await this.prisma.supplier.findMany({
      include: { transactions: { orderBy: { date: 'desc' } } },
      orderBy: { name: 'asc' },
    });
    return suppliers.map((s) => ({
      ...s,
      balance: this.calcBalance(s.transactions),
    }));
  }

  async getSupplier(id: number) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        transactions: {
          include: { stockCard: { select: { id: true, name: true, sku: true, stockQuantity: true } } },
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!s) throw new NotFoundException('Tedarikçi bulunamadı.');
    return { ...s, balance: this.calcBalance(s.transactions) };
  }

  async createSupplier(body: { name: string; phone?: string; email?: string; address?: string; notes?: string }) {
    if (!body.name?.trim()) throw new BadRequestException('Tedarikçi adı zorunludur.');
    return this.prisma.supplier.create({ data: { name: body.name.trim(), phone: body.phone, email: body.email, address: body.address, notes: body.notes } });
  }

  async updateSupplier(id: number, body: { name?: string; phone?: string; email?: string; address?: string; notes?: string }) {
    await this.getSupplier(id);
    return this.prisma.supplier.update({ where: { id }, data: { name: body.name?.trim(), phone: body.phone, email: body.email, address: body.address, notes: body.notes } });
  }

  async deleteSupplier(id: number) {
    await this.getSupplier(id);
    return this.prisma.supplier.delete({ where: { id } });
  }

  async addDebtTransaction(body: {
    supplierId: number;
    type: 'DEBT_ADDED' | 'PAYMENT_MADE';
    amount: number;
    date: string;
    description?: string;
    documentNo?: string;
    stockCardId?: number;
    quantity?: number;
    unitPrice?: number;
  }) {
    const { supplierId, type, amount, date, description, documentNo, stockCardId, quantity, unitPrice } = body;

    if (!supplierId) throw new BadRequestException('Tedarikçi seçilmelidir.');
    if (!amount || amount <= 0) throw new BadRequestException('Tutar 0\'dan büyük olmalıdır.');
    if (!date) throw new BadRequestException('Tarih zorunludur.');
    if (!['DEBT_ADDED', 'PAYMENT_MADE'].includes(type)) throw new BadRequestException('Geçersiz işlem tipi.');

    await this.getSupplier(supplierId);

    const tx = await this.prisma.$transaction(async (p) => {
      const transaction = await p.debtTransaction.create({
        data: {
          supplierId,
          type,
          amount,
          date: new Date(date),
          description,
          documentNo,
          stockCardId: stockCardId || null,
          quantity: quantity || null,
          unitPrice: unitPrice || null,
        },
        include: { stockCard: { select: { id: true, name: true, sku: true } } },
      });

      // Mal gelince stok artır
      if (type === 'DEBT_ADDED' && stockCardId && quantity && quantity > 0) {
        await p.stockCard.update({
          where: { id: stockCardId },
          data: {
            stockQuantity: { increment: quantity },
            lastMovementAt: new Date(),
          },
        });
      }

      return transaction;
    });

    return tx;
  }

  async deleteTransaction(id: number) {
    const tx = await this.prisma.debtTransaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('İşlem bulunamadı.');

    await this.prisma.$transaction(async (p) => {
      // Silinecek işlem DEBT_ADDED ise stoktan geri düş
      if (tx.type === 'DEBT_ADDED' && tx.stockCardId && tx.quantity) {
        await p.stockCard.update({
          where: { id: tx.stockCardId },
          data: { stockQuantity: { decrement: Number(tx.quantity) } },
        });
      }
      await p.debtTransaction.delete({ where: { id } });
    });

    return { deleted: true };
  }

  async summary() {
    const suppliers = await this.prisma.supplier.findMany({ include: { transactions: true } });
    const rows = suppliers.map((s) => ({ id: s.id, name: s.name, balance: this.calcBalance(s.transactions) }));
    const totalDebt = rows.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0);
    return { suppliers: rows, totalDebt };
  }

  /**
   * Tüm borçlar tek ekranda: tedarikçi cari bakiyeleri + taksitli borçlar + aylık faturalar.
   * `upcoming`: gecikmiş + önümüzdeki `days` gün içinde vadesi gelen ödemeler (tarih sırasıyla).
   */
  async overview(days = 45) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + days * 86400000);

    const [suppliers, installments, bills] = await Promise.all([
      this.prisma.supplier.findMany({ include: { transactions: { select: { type: true, amount: true } } } }),
      this.prisma.debtInstallment.findMany({
        where: { paidAt: null },
        include: { debt: { select: { id: true, title: true, creditor: true, installmentCount: true, supplier: { select: { name: true } } } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.billAccount.findMany({
        where: { isActive: true },
        include: { payments: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 3 } },
      }),
    ]);

    const supplierDebt = suppliers.reduce((sum, s) => {
      const b = this.calcBalance(s.transactions);
      return sum + (b > 0 ? b : 0);
    }, 0);
    const installmentRemaining = installments.reduce((s, i) => s + Number(i.amount), 0);

    type Upcoming = {
      kind: 'INSTALLMENT' | 'BILL';
      refId: number;
      title: string;
      party: string | null;
      dueDate: string;
      amount: number | null;
      overdue: boolean;
      detail?: string | null;
    };
    const upcoming: Upcoming[] = [];

    for (const i of installments) {
      if (i.dueDate > horizon) continue;
      upcoming.push({
        kind: 'INSTALLMENT',
        refId: i.id,
        title: i.debt.title,
        party: i.debt.supplier?.name ?? i.debt.creditor,
        dueDate: i.dueDate.toISOString(),
        amount: Number(i.amount),
        overdue: i.dueDate < today,
        detail: `${i.no}/${i.debt.installmentCount}. taksit`,
      });
    }

    // Faturalar: bu ay ve önceki ay (ödenmemişse) + vadesi ufuk içindeyse gelecek ay
    let billsUnpaid = 0;
    const months: Array<{ y: number; m: number }> = [];
    for (let k = -1; k <= 1; k++) {
      const d = new Date(today.getFullYear(), today.getMonth() + k, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
    }
    for (const a of bills) {
      for (const { y, m } of months) {
        if (a.createdAt > new Date(y, m, 0, 23, 59)) continue; // hesap o aydan sonra açıldı
        const p = a.payments.find((x) => x.year === y && x.month === m);
        if (p?.paidAt) continue;
        const lastDay = new Date(y, m, 0).getDate();
        const due = p?.dueDate ?? new Date(y, m - 1, Math.min(a.dueDay, lastDay));
        if (due > horizon) continue;
        const amount = p?.amount != null ? Number(p.amount) : a.estimatedAmount != null ? Number(a.estimatedAmount) : null;
        billsUnpaid += amount ?? 0;
        upcoming.push({
          kind: 'BILL',
          refId: a.id,
          title: a.name,
          party: a.provider,
          dueDate: due.toISOString(),
          amount,
          overdue: due < today,
          detail: [p?.invoiceNo ? `Fatura no ${p.invoiceNo}` : null, p?.amount == null ? 'tahmini' : null].filter(Boolean).join(' • ') || null,
        });
      }
    }

    upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return {
      supplierDebt: r2(supplierDebt),
      installmentRemaining: r2(installmentRemaining),
      billsUnpaid: r2(billsUnpaid),
      grandTotal: r2(supplierDebt + installmentRemaining + billsUnpaid),
      overdueTotal: r2(upcoming.filter((u) => u.overdue).reduce((s, u) => s + (u.amount ?? 0), 0)),
      upcoming,
    };
  }

  private calcBalance(transactions: { type: string; amount: any }[]) {
    return transactions.reduce((sum, t) => {
      const amt = Number(t.amount);
      return t.type === 'DEBT_ADDED' ? sum + amt : sum - amt;
    }, 0);
  }
}
