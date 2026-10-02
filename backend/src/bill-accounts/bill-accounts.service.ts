import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillAccountsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const accounts = await this.prisma.billAccount.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { type: 'asc' }, { name: 'asc' }],
      include: {
        payments: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 3,
        },
      },
    });
    return accounts;
  }

  async create(data: {
    type: string;
    name: string;
    dueDay: number;
    statementDay?: number;
    estimatedAmount?: number;
    sortOrder?: number;
  }) {
    return this.prisma.billAccount.create({
      data: {
        type: data.type,
        name: data.name,
        dueDay: data.dueDay,
        statementDay: data.statementDay ?? null,
        estimatedAmount: data.estimatedAmount ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      dueDay?: number;
      statementDay?: number | null;
      estimatedAmount?: number | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.billAccount.update({ where: { id }, data });
  }

  async remove(id: number) {
    return this.prisma.billAccount.update({ where: { id }, data: { isActive: false } });
  }

  async togglePayment(billAccountId: number, year: number, month: number, amount?: number, note?: string) {
    const existing = await this.prisma.billPayment.findUnique({
      where: { billAccountId_year_month: { billAccountId, year, month } },
    });

    if (existing?.paidAt) {
      // Ödendi → geri al
      return this.prisma.billPayment.update({
        where: { billAccountId_year_month: { billAccountId, year, month } },
        data: { paidAt: null, amount: null, note: null },
      });
    }

    return this.prisma.billPayment.upsert({
      where: { billAccountId_year_month: { billAccountId, year, month } },
      create: { billAccountId, year, month, paidAt: new Date(), amount: amount ?? null, note: note ?? null },
      update: { paidAt: new Date(), amount: amount ?? null, note: note ?? null },
    });
  }
}
