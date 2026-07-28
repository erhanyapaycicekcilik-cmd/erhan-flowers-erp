import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FinanceAccountType,
  FinanceCategoryKind,
  FinanceDirection,
  FinancePaymentStatus,
  FinanceRecordStatus,
  FinanceRecurringFrequency,
  FinanceTransactionType,
  Prisma,
  RecordStatus,
} from '../generated/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

const expenseCategories = [
  'Elektrik',
  'Su',
  'Telefon',
  'İnternet',
  'Kira',
  'Personel Maaşı',
  'SGK',
  'Vergi',
  'Banka Kredisi',
  'Kredi Kartı',
  'Tedarikçi',
  'Kargo',
  'Reklam',
  'Yakıt',
  'Araç',
  'Paketleme',
  'Bakım',
  'Diğer',
];

const incomeSources = [
  'Trendyol Erhan Flowers',
  'Trendyol florayapaycicek.com',
  'Hepsiburada',
  'N11',
  'Kendi Site',
  'Mağaza',
  'Havale/EFT',
  'Nakit',
  'Proje/Dekorasyon',
  'Diğer',
];

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap() {
    await this.ensureDefaults();
    return {
      accounts: await this.listAccounts(),
      categories: await this.listCategories(),
      channels: await this.listSalesChannels(),
    };
  }

  async summary(range = 'month') {
    await this.ensureDefaults();
    await this.generateDueRecurringDebts(1);
    const { start, end } = this.dateRange(range);
    const transactionWhere = {
      status: 'ACTIVE' as FinanceRecordStatus,
      transactionDate: { gte: start, lte: end },
    };

    const transactions = await this.prisma.financeTransaction.findMany({
      where: transactionWhere,
      include: { account: true, category: true, recordedBy: true },
      orderBy: { transactionDate: 'desc' },
      take: 30,
    });
    const allRangeTransactions = await this.prisma.financeTransaction.findMany({ where: transactionWhere });
    const marketplaceRecords = await this.prisma.financeMarketplaceDailyRecord.findMany({
      where: { recordDate: { gte: start, lte: end } },
      include: { channel: true },
      orderBy: { recordDate: 'desc' },
    });
    const debts = await this.prisma.financeDebt.findMany({
      where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });
    const upcomingDebts = debts.filter((item) => item.dueDate >= new Date());
    const overdueDebts = debts.filter((item) => item.dueDate < new Date());
    const accounts = await this.listAccounts();

    const grossSales = this.sumMarketplace(marketplaceRecords, 'grossSales');
    const netSales = this.sumMarketplace(marketplaceRecords, 'netSettlement');
    const totalExpense = this.sumTransactions(allRangeTransactions, ['EXPENSE', 'PAYMENT', 'SALARY', 'REGULAR_PAYMENT']);
    const totalCollection = this.sumTransactions(allRangeTransactions, ['INCOME', 'COLLECTION', 'MARKETPLACE_SETTLEMENT']);
    const totalPayment = this.sumTransactions(allRangeTransactions, ['EXPENSE', 'PAYMENT', 'SALARY', 'REGULAR_PAYMENT']);
    const totalDebt = await this.sumDebts('DEBT');
    const totalReceivable = await this.sumDebts('RECEIVABLE');
    const bankBalance = accounts.filter((item) => item.type === 'BANK').reduce((sum, item) => sum + item.balance, 0);
    const cashBalance = accounts.filter((item) => item.type === 'CASH').reduce((sum, item) => sum + item.balance, 0);
    const pendingSettlement = marketplaceRecords
      .filter((item) => item.paymentStatus !== 'PAID')
      .reduce((sum, item) => sum + Number(item.netSettlement) - Number(item.actualPayment), 0);

    return {
      cards: {
        todaySales: await this.todaySales(),
        monthNetIncome: netSales + totalCollection,
        monthExpense: totalExpense,
        pendingSettlement: this.round(pendingSettlement),
        payableDebt: totalDebt,
        cashAndBank: this.round(bankBalance + cashBalance),
        grossSales,
        netSales,
        totalExpense,
        totalCollection,
        totalPayment,
        totalDebt,
        totalReceivable,
        bankBalance: this.round(bankBalance),
        cashBalance: this.round(cashBalance),
        estimatedProfit: this.round(netSales + totalCollection - totalExpense),
      },
      accounts,
      channels: await this.channelReport(start, end),
      expenseReport: await this.expenseReport(start, end),
      upcomingDebts: upcomingDebts.map((item) => this.serializeDebt(item)),
      overdueDebts: overdueDebts.map((item) => this.serializeDebt(item)),
      recentTransactions: transactions.map((item) => this.serializeTransaction(item)),
      marketplaceRecords: marketplaceRecords.map((item) => this.serializeMarketplace(item)),
      categories: await this.listCategories(),
      salesChannels: await this.listSalesChannels(),
    };
  }

  async listAccounts() {
    await this.ensureDefaults();
    const accounts = await this.prisma.financeAccount.findMany({ orderBy: { name: 'asc' } });
    const transactions = await this.prisma.financeTransaction.findMany({ where: { status: 'ACTIVE' } });
    return accounts.map((account) => {
      const movementTotal = transactions
        .filter((item) => item.accountId === account.id)
        .reduce((sum, item) => sum + (item.direction === 'IN' ? Number(item.amount) : item.direction === 'OUT' ? -Number(item.amount) : 0), 0);
      return {
        ...account,
        openingBalance: Number(account.openingBalance),
        balance: this.round(Number(account.openingBalance) + movementTotal),
      };
    });
  }

  async listCategories() {
    await this.ensureDefaults();
    return this.prisma.financeCategory.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }

  async listSalesChannels() {
    await this.ensureDefaults();
    return this.prisma.financeSalesChannel.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
  }

  async createAccount(payload: unknown) {
    const body = payload as Record<string, unknown>;
    const name = this.text(body.name);
    if (!name) throw new BadRequestException('Hesap adı zorunludur.');
    const type = this.accountType(body.type);
    return this.prisma.financeAccount.create({
      data: {
        name,
        type,
        openingBalance: this.number(body.openingBalance, 0),
      },
    });
  }

  async createCategory(payload: unknown) {
    const body = payload as Record<string, unknown>;
    const name = this.text(body.name);
    if (!name) throw new BadRequestException('Kategori adı zorunludur.');
    return this.prisma.financeCategory.create({
      data: {
        name,
        kind: this.categoryKind(body.kind),
      },
    });
  }

  async createSalesChannel(payload: unknown) {
    const body = payload as Record<string, unknown>;
    const name = this.text(body.name);
    if (!name) throw new BadRequestException('Satış kanalı adı zorunludur.');
    return this.prisma.financeSalesChannel.create({ data: { name } });
  }

  async createTransaction(payload: unknown, userId: number) {
    await this.ensureDefaults();
    const body = payload as Record<string, unknown>;
    const transactionType = this.transactionType(body.transactionType);
    const direction = this.directionFor(transactionType);
    const accountId = this.requiredNumber(body.accountId, 'Ödeme/tahsilat hesabı zorunludur.');
    const categoryId = this.optionalNumber(body.categoryId);
    const amount = this.requiredPositiveNumber(body.amount, 'Tutar zorunludur.');
    const description = this.text(body.description);
    if (!description) throw new BadRequestException('Açıklama zorunludur.');
    const transactionDate = this.date(body.transactionDate) ?? new Date();
    const linkedRecordType = this.text(body.linkedRecordType);
    const linkedRecordId = this.text(body.linkedRecordId);
    const externalKey = linkedRecordType && linkedRecordId ? `${transactionType}:${linkedRecordType}:${linkedRecordId}` : this.text(body.externalKey);

    await this.ensureAccount(accountId);
    if (categoryId) await this.ensureCategory(categoryId);
    if (externalKey) {
      const existing = await this.prisma.financeTransaction.findUnique({ where: { externalKey } });
      if (existing) throw new BadRequestException('Bu bağlantılı işlem için daha önce finans kaydı oluşturulmuş.');
    }

    const transaction = await this.prisma.financeTransaction.create({
      data: {
        transactionType,
        direction,
        accountId,
        categoryId,
        amount,
        transactionDate,
        description,
        linkedRecordType,
        linkedRecordId,
        externalKey,
        recordedByUserId: userId,
      },
      include: { account: true, category: true, recordedBy: true },
    });
    await this.log(userId, 'CREATE_TRANSACTION', null, transaction, 'Yeni finans hareketi oluşturuldu.', transaction.id);
    return this.serializeTransaction(transaction);
  }

  async cancelTransaction(id: number, reason: string, userId: number) {
    const existing = await this.prisma.financeTransaction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Finans kaydı bulunamadı.');
    if (existing.status !== 'ACTIVE') throw new BadRequestException('Bu kayıt zaten aktif değil.');
    const updated = await this.prisma.financeTransaction.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: reason || 'Sebep girilmedi.' },
      include: { account: true, category: true, recordedBy: true },
    });
    await this.log(userId, 'CANCEL_TRANSACTION', existing, updated, reason, id);
    return this.serializeTransaction(updated);
  }

  async createDebt(payload: unknown, userId: number) {
    const body = payload as Record<string, unknown>;
    const debtType = this.transactionType(body.debtType ?? 'DEBT');
    if (!['DEBT', 'RECEIVABLE'].includes(debtType)) throw new BadRequestException('Borç/alacak türü geçersiz.');
    const amount = this.requiredPositiveNumber(body.amount, 'Tutar zorunludur.');
    const title = this.text(body.title);
    if (!title) throw new BadRequestException('Başlık zorunludur.');
    const dueDate = this.date(body.dueDate);
    if (!dueDate) throw new BadRequestException('Vade tarihi zorunludur.');

    const debt = await this.prisma.financeDebt.create({
      data: {
        debtType,
        title,
        partyName: this.text(body.partyName),
        amount,
        remainingAmount: amount,
        dueDate,
        accountId: this.optionalNumber(body.accountId),
        linkedRecordType: this.text(body.linkedRecordType),
        linkedRecordId: this.text(body.linkedRecordId),
        createdByUserId: userId,
      },
    });
    return this.serializeDebt(debt);
  }

  async createMarketplaceRecord(payload: unknown, userId: number) {
    const body = payload as Record<string, unknown>;
    const channelId = this.requiredNumber(body.channelId, 'Satış kanalı zorunludur.');
    const recordDate = this.date(body.recordDate);
    if (!recordDate) throw new BadRequestException('Tarih zorunludur.');
    await this.ensureChannel(channelId);

    const grossSales = this.number(body.grossSales, 0);
    const cancellationAmount = this.number(body.cancellationAmount, 0);
    const returnAmount = this.number(body.returnAmount, 0);
    const commissionAmount = this.number(body.commissionAmount, 0);
    const cargoDeduction = this.number(body.cargoDeduction, 0);
    const advertisingDeduction = this.number(body.advertisingDeduction, 0);
    const otherDeduction = this.number(body.otherDeduction, 0);
    const netSettlement = this.round(
      grossSales - cancellationAmount - returnAmount - commissionAmount - cargoDeduction - advertisingDeduction - otherDeduction,
    );
    const actualPayment = this.number(body.actualPayment, 0);
    const paymentStatus = actualPayment >= netSettlement && netSettlement > 0 ? 'PAID' : actualPayment > 0 ? 'PARTIAL' : 'PENDING';

    const record = await this.prisma.financeMarketplaceDailyRecord.upsert({
      where: { channelId_recordDate: { channelId, recordDate } },
      update: {
        orderCount: this.number(body.orderCount, 0),
        grossSales,
        cancellationAmount,
        returnAmount,
        commissionAmount,
        cargoDeduction,
        advertisingDeduction,
        otherDeduction,
        netSettlement,
        expectedPaymentDate: this.date(body.expectedPaymentDate),
        actualPayment,
        paymentStatus,
        accountId: this.optionalNumber(body.accountId),
      },
      create: {
        channelId,
        recordDate,
        orderCount: this.number(body.orderCount, 0),
        grossSales,
        cancellationAmount,
        returnAmount,
        commissionAmount,
        cargoDeduction,
        advertisingDeduction,
        otherDeduction,
        netSettlement,
        expectedPaymentDate: this.date(body.expectedPaymentDate),
        actualPayment,
        paymentStatus,
        accountId: this.optionalNumber(body.accountId),
      },
      include: { channel: true, account: true },
    });

    if (actualPayment > 0 && body.accountId) {
      const externalKey = `MARKETPLACE_PAYMENT:${record.id}`;
      const existing = await this.prisma.financeTransaction.findUnique({ where: { externalKey } });
      if (!existing) {
        const category = await this.findCategory('Pazaryeri Hakedişi', 'INCOME');
        const transaction = await this.prisma.financeTransaction.create({
          data: {
            transactionType: 'MARKETPLACE_SETTLEMENT',
            direction: 'IN',
            categoryId: category?.id,
            amount: actualPayment,
            transactionDate: new Date(),
            accountId: Number(body.accountId),
            description: `${record.channel.name} hakediş tahsilatı`,
            linkedRecordType: 'pazaryeri_hakedis',
            linkedRecordId: String(record.id),
            externalKey,
            recordedByUserId: userId,
          },
        });
        await this.prisma.financeMarketplaceDailyRecord.update({ where: { id: record.id }, data: { transactionId: transaction.id } });
      }
    }

    return this.serializeMarketplace(record);
  }

  async createRecurring(payload: unknown) {
    const body = payload as Record<string, unknown>;
    const title = this.text(body.title);
    if (!title) throw new BadRequestException('Düzenli ödeme adı zorunludur.');
    const categoryId = this.requiredNumber(body.categoryId, 'Kategori zorunludur.');
    const amount = this.requiredPositiveNumber(body.amount, 'Tutar zorunludur.');
    const nextDueDate = this.date(body.nextDueDate);
    if (!nextDueDate) throw new BadRequestException('Vade tarihi zorunludur.');
    return this.prisma.financeRecurringPayment.create({
      data: {
        title,
        categoryId,
        accountId: this.optionalNumber(body.accountId),
        amount,
        frequency: this.frequency(body.frequency),
        nextDueDate,
        description: this.text(body.description),
      },
    });
  }

  async createSalary(payload: unknown, userId: number) {
    const body = payload as Record<string, unknown>;
    const staffName = this.text(body.staffName);
    const period = this.text(body.period);
    if (!staffName || !period) throw new BadRequestException('Personel adı ve dönem zorunludur.');
    const netSalary = this.number(body.netSalary, 0);
    const advance = this.number(body.advance, 0);
    const bonus = this.number(body.bonus, 0);
    const deduction = this.number(body.deduction, 0);
    const paidAmount = this.number(body.paidAmount, 0);
    const totalPayable = netSalary + bonus - advance - deduction;
    const remainingAmount = Math.max(0, totalPayable - paidAmount);
    const status: FinancePaymentStatus = remainingAmount <= 0 && totalPayable > 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';
    let transactionId: number | undefined;

    if (paidAmount > 0 && body.accountId) {
      const category = await this.findCategory('Personel Maaşı', 'EXPENSE');
      const transaction = await this.prisma.financeTransaction.create({
        data: {
          transactionType: 'SALARY',
          direction: 'OUT',
          categoryId: category?.id,
          amount: paidAmount,
          transactionDate: this.date(body.paymentDate) ?? new Date(),
          accountId: Number(body.accountId),
          description: `${staffName} ${period} maaş ödemesi`,
          linkedRecordType: 'personel',
          linkedRecordId: this.text(body.staffId) ?? staffName,
          externalKey: `SALARY:${staffName}:${period}`,
          recordedByUserId: userId,
        },
      });
      transactionId = transaction.id;
    }

    return this.prisma.financeSalaryRecord.upsert({
      where: { staffName_period: { staffName, period } },
      update: {
        staffId: this.text(body.staffId),
        netSalary,
        advance,
        bonus,
        deduction,
        paidAmount,
        remainingAmount,
        paymentDate: this.date(body.paymentDate),
        accountId: this.optionalNumber(body.accountId),
        status,
        transactionId,
      },
      create: {
        staffId: this.text(body.staffId),
        staffName,
        period,
        netSalary,
        advance,
        bonus,
        deduction,
        paidAmount,
        remainingAmount,
        paymentDate: this.date(body.paymentDate),
        accountId: this.optionalNumber(body.accountId),
        status,
        transactionId,
        recordedByUserId: userId,
      },
    });
  }

  private async ensureDefaults() {
    const accountCount = await this.prisma.financeAccount.count();
    if (accountCount === 0) {
      await this.prisma.financeAccount.createMany({
        data: [
          { name: 'Ana Banka Hesabı', type: 'BANK', openingBalance: 0 },
          { name: 'Nakit Kasa', type: 'CASH', openingBalance: 0 },
          { name: 'Kredi Kartı', type: 'CREDIT_CARD', openingBalance: 0 },
          { name: 'Pazaryeri Hakediş Hesabı', type: 'MARKETPLACE_RECEIVABLE', openingBalance: 0 },
        ],
      });
    }

    for (const name of expenseCategories) {
      await this.prisma.financeCategory.upsert({
        where: { name_kind: { name, kind: 'EXPENSE' } },
        update: { isSystem: true, status: 'ACTIVE' },
        create: { name, kind: 'EXPENSE', isSystem: true },
      });
    }
    for (const name of ['Pazaryeri Hakedişi', ...incomeSources]) {
      await this.prisma.financeCategory.upsert({
        where: { name_kind: { name, kind: 'INCOME' } },
        update: { isSystem: true, status: 'ACTIVE' },
        create: { name, kind: 'INCOME', isSystem: true },
      });
      await this.prisma.financeSalesChannel.upsert({
        where: { name },
        update: { status: 'ACTIVE' },
        create: { name },
      }).catch(() => null);
    }
  }

  private async generateDueRecurringDebts(userId: number) {
    const now = new Date();
    const dueItems = await this.prisma.financeRecurringPayment.findMany({
      where: { status: 'ACTIVE', nextDueDate: { lte: now } },
      include: { category: true },
    });

    for (const item of dueItems) {
      const key = `RECURRING:${item.id}:${item.nextDueDate.toISOString().slice(0, 10)}`;
      const existing = await this.prisma.financeDebt.findFirst({ where: { linkedRecordType: 'duzenli_odeme', linkedRecordId: key } });
      if (!existing) {
        await this.prisma.financeDebt.create({
          data: {
            debtType: 'DEBT',
            title: item.title,
            partyName: item.category.name,
            amount: item.amount,
            remainingAmount: item.amount,
            dueDate: item.nextDueDate,
            accountId: item.accountId,
            linkedRecordType: 'duzenli_odeme',
            linkedRecordId: key,
            createdByUserId: userId,
          },
        });
      }
      await this.prisma.financeRecurringPayment.update({
        where: { id: item.id },
        data: { nextDueDate: this.nextDate(item.nextDueDate, item.frequency) },
      });
    }
  }

  private async channelReport(start: Date, end: Date) {
    const records = await this.prisma.financeMarketplaceDailyRecord.findMany({
      where: { recordDate: { gte: start, lte: end } },
      include: { channel: true },
    });
    const map = new Map<string, { channel: string; orderCount: number; grossSales: number; returns: number; deductions: number; netIncome: number }>();
    for (const item of records) {
      const current = map.get(item.channel.name) ?? { channel: item.channel.name, orderCount: 0, grossSales: 0, returns: 0, deductions: 0, netIncome: 0 };
      current.orderCount += item.orderCount;
      current.grossSales += Number(item.grossSales);
      current.returns += Number(item.returnAmount) + Number(item.cancellationAmount);
      current.deductions += Number(item.commissionAmount) + Number(item.cargoDeduction) + Number(item.advertisingDeduction) + Number(item.otherDeduction);
      current.netIncome += Number(item.netSettlement);
      map.set(item.channel.name, current);
    }
    return Array.from(map.values()).map((item) => ({
      ...item,
      grossSales: this.round(item.grossSales),
      returns: this.round(item.returns),
      deductions: this.round(item.deductions),
      netIncome: this.round(item.netIncome),
    }));
  }

  private async expenseReport(start: Date, end: Date) {
    const transactions = await this.prisma.financeTransaction.findMany({
      where: {
        status: 'ACTIVE',
        direction: 'OUT',
        transactionDate: { gte: start, lte: end },
      },
      include: { category: true },
    });
    const map = new Map<string, number>();
    for (const item of transactions) {
      const name = item.category?.name ?? 'Kategorisiz';
      map.set(name, (map.get(name) ?? 0) + Number(item.amount));
    }
    return Array.from(map.entries()).map(([category, total]) => ({ category, total: this.round(total), previousDifference: 0 }));
  }

  private async todaySales() {
    const { start, end } = this.dateRange('today');
    const marketplace = await this.prisma.financeMarketplaceDailyRecord.findMany({ where: { recordDate: { gte: start, lte: end } } });
    const direct = await this.prisma.financeTransaction.findMany({ where: { status: 'ACTIVE', direction: 'IN', transactionDate: { gte: start, lte: end } } });
    return this.round(this.sumMarketplace(marketplace, 'grossSales') + direct.reduce((sum, item) => sum + Number(item.amount), 0));
  }

  private async sumDebts(type: 'DEBT' | 'RECEIVABLE') {
    const data = await this.prisma.financeDebt.findMany({ where: { debtType: type, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } });
    return this.round(data.reduce((sum, item) => sum + Number(item.remainingAmount), 0));
  }

  private sumTransactions(transactions: Array<{ transactionType: FinanceTransactionType; amount: Prisma.Decimal }>, types: FinanceTransactionType[]) {
    return this.round(transactions.filter((item) => types.includes(item.transactionType)).reduce((sum, item) => sum + Number(item.amount), 0));
  }

  private sumMarketplace(records: Array<Record<string, unknown>>, key: string) {
    return this.round(records.reduce((sum, item) => sum + Number(item[key] ?? 0), 0));
  }

  private dateRange(range: string) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (range === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (range === 'week') {
      start.setDate(start.getDate() - 6);
    } else if (range === 'month') {
      start.setDate(1);
    } else if (range === 'lastMonth') {
      start.setMonth(start.getMonth() - 1, 1);
      end.setMonth(start.getMonth() + 1, 0);
    }
    return { start, end };
  }

  private serializeTransaction(item: any) {
    return {
      ...item,
      amount: Number(item.amount),
      account: item.account,
      category: item.category,
      recordedBy: item.recordedBy,
    };
  }

  private serializeDebt(item: any) {
    return {
      ...item,
      amount: Number(item.amount),
      remainingAmount: Number(item.remainingAmount),
    };
  }

  private serializeMarketplace(item: any) {
    return {
      ...item,
      grossSales: Number(item.grossSales),
      cancellationAmount: Number(item.cancellationAmount),
      returnAmount: Number(item.returnAmount),
      commissionAmount: Number(item.commissionAmount),
      cargoDeduction: Number(item.cargoDeduction),
      advertisingDeduction: Number(item.advertisingDeduction),
      otherDeduction: Number(item.otherDeduction),
      netSettlement: Number(item.netSettlement),
      actualPayment: Number(item.actualPayment),
    };
  }

  private async log(userId: number, action: string, oldValue: unknown, newValue: unknown, reason?: string, transactionId?: number) {
    await this.prisma.financeAuditLog.create({
      data: {
        userId,
        transactionId,
        action,
        reason,
        oldValue: oldValue === null ? Prisma.JsonNull : JSON.parse(JSON.stringify(oldValue)),
        newValue: newValue === null ? Prisma.JsonNull : JSON.parse(JSON.stringify(newValue)),
      },
    });
  }

  private async ensureAccount(id: number) {
    const account = await this.prisma.financeAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Hesap bulunamadı.');
  }

  private async ensureCategory(id: number) {
    const category = await this.prisma.financeCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Kategori bulunamadı.');
  }

  private async ensureChannel(id: number) {
    const channel = await this.prisma.financeSalesChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Satış kanalı bulunamadı.');
  }

  private findCategory(name: string, kind: FinanceCategoryKind) {
    return this.prisma.financeCategory.findUnique({ where: { name_kind: { name, kind } } });
  }

  private directionFor(type: FinanceTransactionType): FinanceDirection {
    if (['INCOME', 'COLLECTION', 'MARKETPLACE_SETTLEMENT'].includes(type)) return 'IN';
    if (['EXPENSE', 'PAYMENT', 'SALARY', 'REGULAR_PAYMENT'].includes(type)) return 'OUT';
    return 'NEUTRAL';
  }

  private transactionType(value: unknown): FinanceTransactionType {
    const allowed = Object.values(FinanceTransactionType);
    return allowed.includes(value as FinanceTransactionType) ? (value as FinanceTransactionType) : 'EXPENSE';
  }

  private accountType(value: unknown): FinanceAccountType {
    const allowed = Object.values(FinanceAccountType);
    return allowed.includes(value as FinanceAccountType) ? (value as FinanceAccountType) : 'BANK';
  }

  private categoryKind(value: unknown): FinanceCategoryKind {
    const allowed = Object.values(FinanceCategoryKind);
    return allowed.includes(value as FinanceCategoryKind) ? (value as FinanceCategoryKind) : 'EXPENSE';
  }

  private frequency(value: unknown): FinanceRecurringFrequency {
    const allowed = Object.values(FinanceRecurringFrequency);
    return allowed.includes(value as FinanceRecurringFrequency) ? (value as FinanceRecurringFrequency) : 'MONTHLY';
  }

  private nextDate(date: Date, frequency: FinanceRecurringFrequency) {
    const next = new Date(date);
    if (frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
    if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
    if (frequency === 'QUARTERLY') next.setMonth(next.getMonth() + 3);
    if (frequency === 'YEARLY') next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  private text(value: unknown) {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    return text || undefined;
  }

  private optionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private requiredNumber(value: unknown, message: string) {
    const parsed = this.optionalNumber(value);
    if (parsed === undefined) throw new BadRequestException(message);
    return parsed;
  }

  private number(value: unknown, fallback: number) {
    const parsed = this.optionalNumber(value);
    return parsed === undefined ? fallback : parsed;
  }

  private requiredPositiveNumber(value: unknown, message: string) {
    const parsed = this.requiredNumber(value, message);
    if (parsed <= 0) throw new BadRequestException(message);
    return parsed;
  }

  private date(value: unknown) {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
