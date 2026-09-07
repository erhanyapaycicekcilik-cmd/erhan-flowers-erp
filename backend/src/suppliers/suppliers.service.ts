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

  private calcBalance(transactions: { type: string; amount: any }[]) {
    return transactions.reduce((sum, t) => {
      const amt = Number(t.amount);
      return t.type === 'DEBT_ADDED' ? sum + amt : sum - amt;
    }, 0);
  }
}
