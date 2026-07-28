'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CreditCard,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Account = {
  id: number;
  name: string;
  type: 'BANK' | 'CASH' | 'CREDIT_CARD' | 'MARKETPLACE_RECEIVABLE';
  openingBalance: number;
  balance: number;
};

type Category = {
  id: number;
  name: string;
  kind: 'INCOME' | 'EXPENSE' | 'BOTH';
};

type SalesChannel = {
  id: number;
  name: string;
};

type FinanceSummary = {
  cards: Record<string, number>;
  accounts: Account[];
  categories: Category[];
  salesChannels: SalesChannel[];
  channels: Array<{ channel: string; orderCount: number; grossSales: number; returns: number; deductions: number; netIncome: number }>;
  expenseReport: Array<{ category: string; total: number; previousDifference: number }>;
  upcomingDebts: Array<{ id: number; title: string; partyName: string | null; remainingAmount: number; dueDate: string; status: string }>;
  overdueDebts: Array<{ id: number; title: string; partyName: string | null; remainingAmount: number; dueDate: string; status: string }>;
  recentTransactions: Array<{
    id: number;
    transactionType: string;
    direction: string;
    amount: number;
    transactionDate: string;
    description: string;
    status: string;
    account: { name: string };
    category?: { name: string } | null;
    recordedBy?: { name: string } | null;
  }>;
};

const emptyMovement = {
  transactionType: 'EXPENSE',
  categoryId: '',
  amount: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  accountId: '',
  description: '',
  linkedRecordType: '',
  linkedRecordId: '',
};

const emptyMarketplace = {
  channelId: '',
  recordDate: new Date().toISOString().slice(0, 10),
  orderCount: '',
  grossSales: '',
  cancellationAmount: '',
  returnAmount: '',
  commissionAmount: '',
  cargoDeduction: '',
  advertisingDeduction: '',
  otherDeduction: '',
  expectedPaymentDate: '',
  actualPayment: '',
  accountId: '',
};

const emptyDebt = {
  debtType: 'DEBT',
  title: '',
  partyName: '',
  amount: '',
  dueDate: new Date().toISOString().slice(0, 10),
  accountId: '',
};

const emptyRecurring = {
  title: '',
  categoryId: '',
  accountId: '',
  amount: '',
  frequency: 'MONTHLY',
  nextDueDate: new Date().toISOString().slice(0, 10),
  description: '',
};

const emptySalary = {
  staffId: '',
  staffName: '',
  period: new Date().toISOString().slice(0, 7),
  netSalary: '',
  advance: '',
  bonus: '',
  deduction: '',
  paidAmount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  accountId: '',
};

export default function FinancePage() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [range, setRange] = useState('month');
  const [movement, setMovement] = useState(emptyMovement);
  const [marketplace, setMarketplace] = useState(emptyMarketplace);
  const [debt, setDebt] = useState(emptyDebt);
  const [recurring, setRecurring] = useState(emptyRecurring);
  const [salary, setSalary] = useState(emptySalary);
  const [newCategory, setNewCategory] = useState({ name: '', kind: 'EXPENSE' });
  const [newChannel, setNewChannel] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setData(await api<FinanceSummary>(`/finance/summary?range=${range}`));
  }

  useEffect(() => {
    load().catch(() => null);
  }, [range]);

  const categories = data?.categories ?? [];
  const accounts = data?.accounts ?? [];
  const channels = data?.salesChannels ?? [];
  const movementCategories = useMemo(() => {
    const wanted = ['INCOME', 'COLLECTION', 'MARKETPLACE_SETTLEMENT'].includes(movement.transactionType) ? 'INCOME' : 'EXPENSE';
    return categories.filter((item) => item.kind === wanted || item.kind === 'BOTH');
  }, [categories, movement.transactionType]);

  async function submitMovement(event: FormEvent) {
    event.preventDefault();
    await api('/finance/transactions', {
      method: 'POST',
      json: {
        ...movement,
        categoryId: movement.categoryId ? Number(movement.categoryId) : undefined,
        accountId: Number(movement.accountId),
        amount: Number(movement.amount),
      },
    });
    setMovement({ ...emptyMovement, accountId: movement.accountId });
    setMessage('Finans hareketi kaydedildi.');
    await load();
  }

  async function submitMarketplace(event: FormEvent) {
    event.preventDefault();
    await api('/finance/marketplace-records', {
      method: 'POST',
      json: {
        ...marketplace,
        channelId: Number(marketplace.channelId),
        accountId: marketplace.accountId ? Number(marketplace.accountId) : undefined,
        orderCount: Number(marketplace.orderCount || 0),
        grossSales: Number(marketplace.grossSales || 0),
        cancellationAmount: Number(marketplace.cancellationAmount || 0),
        returnAmount: Number(marketplace.returnAmount || 0),
        commissionAmount: Number(marketplace.commissionAmount || 0),
        cargoDeduction: Number(marketplace.cargoDeduction || 0),
        advertisingDeduction: Number(marketplace.advertisingDeduction || 0),
        otherDeduction: Number(marketplace.otherDeduction || 0),
        actualPayment: Number(marketplace.actualPayment || 0),
      },
    });
    setMarketplace({ ...emptyMarketplace, channelId: marketplace.channelId, accountId: marketplace.accountId });
    setMessage('Pazaryeri günlük kaydı kaydedildi. Aynı kanal ve tarih varsa kayıt güncellendi.');
    await load();
  }

  async function submitDebt(event: FormEvent) {
    event.preventDefault();
    await api('/finance/debts', {
      method: 'POST',
      json: {
        ...debt,
        accountId: debt.accountId ? Number(debt.accountId) : undefined,
        amount: Number(debt.amount),
      },
    });
    setDebt(emptyDebt);
    setMessage('Borç/alacak kaydı oluşturuldu.');
    await load();
  }

  async function submitRecurring(event: FormEvent) {
    event.preventDefault();
    await api('/finance/recurring-payments', {
      method: 'POST',
      json: {
        ...recurring,
        categoryId: Number(recurring.categoryId),
        accountId: recurring.accountId ? Number(recurring.accountId) : undefined,
        amount: Number(recurring.amount),
      },
    });
    setRecurring(emptyRecurring);
    setMessage('Düzenli ödeme kaydı oluşturuldu.');
    await load();
  }

  async function submitSalary(event: FormEvent) {
    event.preventDefault();
    await api('/finance/salaries', {
      method: 'POST',
      json: {
        ...salary,
        accountId: salary.accountId ? Number(salary.accountId) : undefined,
        netSalary: Number(salary.netSalary || 0),
        advance: Number(salary.advance || 0),
        bonus: Number(salary.bonus || 0),
        deduction: Number(salary.deduction || 0),
        paidAmount: Number(salary.paidAmount || 0),
      },
    });
    setSalary(emptySalary);
    setMessage('Maaş kaydı oluşturuldu. Ödeme tutarı girildiyse finans gideri otomatik işlendi.');
    await load();
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    await api('/finance/categories', { method: 'POST', json: newCategory });
    setNewCategory({ name: '', kind: newCategory.kind });
    setMessage('Yeni kategori eklendi.');
    await load();
  }

  async function addChannel(event: FormEvent) {
    event.preventDefault();
    await api('/finance/sales-channels', { method: 'POST', json: { name: newChannel } });
    setNewChannel('');
    setMessage('Yeni satış kanalı eklendi.');
    await load();
  }

  const cards = [
    { label: 'Bugünkü Satış', value: data?.cards.todaySales ?? 0, icon: ShoppingBag },
    { label: 'Bu Ay Net Gelir', value: data?.cards.monthNetIncome ?? 0, icon: TrendingUp },
    { label: 'Bu Ay Gider', value: data?.cards.monthExpense ?? 0, icon: TrendingDown },
    { label: 'Bekleyen Hakediş', value: data?.cards.pendingSettlement ?? 0, icon: CalendarClock },
    { label: 'Ödenecek Borç', value: data?.cards.payableDebt ?? 0, icon: ReceiptText },
    { label: 'Kasa + Banka', value: data?.cards.cashAndBank ?? 0, icon: Wallet },
  ];

  return (
    <AdminShell title="Finans Merkezi">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Finans, Gelir, Gider ve Nakit Akışı</h2>
          <p className="text-sm text-slate-500">Tüm para giriş ve çıkışları hesap, kategori ve bağlantılı kayıt ile izlenir.</p>
        </div>
        <div className="flex gap-2">
          <select className="field min-w-40" value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="today">Bugün</option>
            <option value="yesterday">Dün</option>
            <option value="week">Bu hafta</option>
            <option value="month">Bu ay</option>
            <option value="lastMonth">Geçen ay</option>
          </select>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={17} />Yenile</button>
        </div>
      </div>

      {message && <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <section key={card.label} className="panel p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500">{card.label}</div>
                  <div className="mt-2 text-xl font-bold">{money(card.value)}</div>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-brand"><Icon size={18} /></div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-5">
          <h2 className="font-bold">Hızlı Finans Hareketi</h2>
          <form onSubmit={submitMovement} className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="field" value={movement.transactionType} onChange={(event) => setMovement({ ...movement, transactionType: event.target.value, categoryId: '' })}>
              <option value="INCOME">Gelir</option>
              <option value="EXPENSE">Gider</option>
              <option value="DEBT">Borç</option>
              <option value="RECEIVABLE">Alacak</option>
              <option value="PAYMENT">Ödeme</option>
              <option value="COLLECTION">Tahsilat</option>
            </select>
            <select className="field" value={movement.categoryId} onChange={(event) => setMovement({ ...movement, categoryId: event.target.value })}>
              <option value="">Kategori</option>
              {movementCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input className="field" type="number" step="0.01" placeholder="Tutar" value={movement.amount} onChange={(event) => setMovement({ ...movement, amount: event.target.value })} required />
            <input className="field" type="date" value={movement.transactionDate} onChange={(event) => setMovement({ ...movement, transactionDate: event.target.value })} required />
            <select className="field" value={movement.accountId} onChange={(event) => setMovement({ ...movement, accountId: event.target.value })} required>
              <option value="">Ödeme/Tahsilat hesabı</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <input className="field" placeholder="Bağlantılı kayıt tipi" value={movement.linkedRecordType} onChange={(event) => setMovement({ ...movement, linkedRecordType: event.target.value })} />
            <input className="field md:col-span-2" placeholder="Açıklama" value={movement.description} onChange={(event) => setMovement({ ...movement, description: event.target.value })} required />
            <input className="field" placeholder="Bağlantılı kayıt no" value={movement.linkedRecordId} onChange={(event) => setMovement({ ...movement, linkedRecordId: event.target.value })} />
            <button className="btn btn-primary"><Save size={17} />Kaydet</button>
          </form>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-bold">Banka ve Kasa</h2>
          </div>
          <div className="divide-y divide-line">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
                <div className="flex items-center gap-3">
                  {account.type === 'CASH' ? <Banknote size={18} /> : account.type === 'CREDIT_CARD' ? <CreditCard size={18} /> : <Landmark size={18} />}
                  <div>
                    <div className="font-semibold">{account.name}</div>
                    <div className="text-xs text-slate-500">{accountTypeLabel(account.type)}</div>
                  </div>
                </div>
                <div className="font-bold">{money(account.balance)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-bold">Pazaryeri Günlük Kaydı</h2>
          <form onSubmit={submitMarketplace} className="mt-4 grid gap-3 md:grid-cols-3">
            <select className="field" value={marketplace.channelId} onChange={(event) => setMarketplace({ ...marketplace, channelId: event.target.value })} required>
              <option value="">Kanal</option>
              {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
            </select>
            <input className="field" type="date" value={marketplace.recordDate} onChange={(event) => setMarketplace({ ...marketplace, recordDate: event.target.value })} required />
            <input className="field" type="number" placeholder="Sipariş adedi" value={marketplace.orderCount} onChange={(event) => setMarketplace({ ...marketplace, orderCount: event.target.value })} />
            <input className="field" type="number" step="0.01" placeholder="Brüt satış" value={marketplace.grossSales} onChange={(event) => setMarketplace({ ...marketplace, grossSales: event.target.value })} />
            <input className="field" type="number" step="0.01" placeholder="İptal" value={marketplace.cancellationAmount} onChange={(event) => setMarketplace({ ...marketplace, cancellationAmount: event.target.value })} />
            <input className="field" type="number" step="0.01" placeholder="İade" value={marketplace.returnAmount} onChange={(event) => setMarketplace({ ...marketplace, returnAmount: event.target.value })} />
            <input className="field" type="number" step="0.01" placeholder="Komisyon" value={marketplace.commissionAmount} onChange={(event) => setMarketplace({ ...marketplace, commissionAmount: event.target.value })} />
            <input className="field" type="number" step="0.01" placeholder="Kargo kesintisi" value={marketplace.cargoDeduction} onChange={(event) => setMarketplace({ ...marketplace, cargoDeduction: event.target.value })} />
            <input className="field" type="number" step="0.01" placeholder="Reklam kesintisi" value={marketplace.advertisingDeduction} onChange={(event) => setMarketplace({ ...marketplace, advertisingDeduction: event.target.value })} />
            <input className="field" type="number" step="0.01" placeholder="Diğer kesinti" value={marketplace.otherDeduction} onChange={(event) => setMarketplace({ ...marketplace, otherDeduction: event.target.value })} />
            <input className="field" type="date" value={marketplace.expectedPaymentDate} onChange={(event) => setMarketplace({ ...marketplace, expectedPaymentDate: event.target.value })} />
            <select className="field" value={marketplace.accountId} onChange={(event) => setMarketplace({ ...marketplace, accountId: event.target.value })}>
              <option value="">Ödeme hesabı</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <input className="field" type="number" step="0.01" placeholder="Gerçekleşen ödeme" value={marketplace.actualPayment} onChange={(event) => setMarketplace({ ...marketplace, actualPayment: event.target.value })} />
            <button className="btn btn-primary md:col-span-2"><Save size={17} />Pazaryeri Kaydet</button>
          </form>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-bold">Satış Kanalları</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Kanal</th>
                  <th className="px-5 py-3">Sipariş</th>
                  <th className="px-5 py-3">Brüt</th>
                  <th className="px-5 py-3">Kesinti</th>
                  <th className="px-5 py-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {(data?.channels ?? []).map((item) => (
                  <tr key={item.channel} className="border-t border-line">
                    <td className="px-5 py-3 font-semibold">{item.channel}</td>
                    <td className="px-5 py-3">{item.orderCount}</td>
                    <td className="px-5 py-3">{money(item.grossSales)}</td>
                    <td className="px-5 py-3">{money(item.deductions)}</td>
                    <td className="px-5 py-3 font-semibold">{money(item.netIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <MiniForm title="Borç / Alacak">
          <form onSubmit={submitDebt} className="space-y-3">
            <select className="field" value={debt.debtType} onChange={(event) => setDebt({ ...debt, debtType: event.target.value })}>
              <option value="DEBT">Borç</option>
              <option value="RECEIVABLE">Alacak</option>
            </select>
            <input className="field" placeholder="Başlık" value={debt.title} onChange={(event) => setDebt({ ...debt, title: event.target.value })} required />
            <input className="field" placeholder="Tedarikçi / müşteri" value={debt.partyName} onChange={(event) => setDebt({ ...debt, partyName: event.target.value })} />
            <input className="field" type="number" step="0.01" placeholder="Tutar" value={debt.amount} onChange={(event) => setDebt({ ...debt, amount: event.target.value })} required />
            <input className="field" type="date" value={debt.dueDate} onChange={(event) => setDebt({ ...debt, dueDate: event.target.value })} required />
            <button className="btn btn-primary w-full"><Plus size={17} />Kaydet</button>
          </form>
        </MiniForm>

        <MiniForm title="Düzenli Ödeme">
          <form onSubmit={submitRecurring} className="space-y-3">
            <input className="field" placeholder="Elektrik, kira, kredi..." value={recurring.title} onChange={(event) => setRecurring({ ...recurring, title: event.target.value })} required />
            <select className="field" value={recurring.categoryId} onChange={(event) => setRecurring({ ...recurring, categoryId: event.target.value })} required>
              <option value="">Kategori</option>
              {categories.filter((item) => item.kind === 'EXPENSE' || item.kind === 'BOTH').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input className="field" type="number" step="0.01" placeholder="Tutar" value={recurring.amount} onChange={(event) => setRecurring({ ...recurring, amount: event.target.value })} required />
            <select className="field" value={recurring.frequency} onChange={(event) => setRecurring({ ...recurring, frequency: event.target.value })}>
              <option value="WEEKLY">Haftalık</option>
              <option value="MONTHLY">Aylık</option>
              <option value="QUARTERLY">Üç aylık</option>
              <option value="YEARLY">Yıllık</option>
            </select>
            <input className="field" type="date" value={recurring.nextDueDate} onChange={(event) => setRecurring({ ...recurring, nextDueDate: event.target.value })} required />
            <button className="btn btn-primary w-full"><CalendarClock size={17} />Kaydet</button>
          </form>
        </MiniForm>

        <MiniForm title="Maaş">
          <form onSubmit={submitSalary} className="space-y-3">
            <input className="field" placeholder="Personel adı" value={salary.staffName} onChange={(event) => setSalary({ ...salary, staffName: event.target.value })} required />
            <input className="field" type="month" value={salary.period} onChange={(event) => setSalary({ ...salary, period: event.target.value })} required />
            <input className="field" type="number" step="0.01" placeholder="Net maaş" value={salary.netSalary} onChange={(event) => setSalary({ ...salary, netSalary: event.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <input className="field" type="number" step="0.01" placeholder="Avans" value={salary.advance} onChange={(event) => setSalary({ ...salary, advance: event.target.value })} />
              <input className="field" type="number" step="0.01" placeholder="Prim" value={salary.bonus} onChange={(event) => setSalary({ ...salary, bonus: event.target.value })} />
              <input className="field" type="number" step="0.01" placeholder="Kesinti" value={salary.deduction} onChange={(event) => setSalary({ ...salary, deduction: event.target.value })} />
            </div>
            <select className="field" value={salary.accountId} onChange={(event) => setSalary({ ...salary, accountId: event.target.value })}>
              <option value="">Ödeme hesabı</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <input className="field" type="number" step="0.01" placeholder="Ödenen" value={salary.paidAmount} onChange={(event) => setSalary({ ...salary, paidAmount: event.target.value })} />
            <button className="btn btn-primary w-full"><Save size={17} />Maaş Kaydet</button>
          </form>
        </MiniForm>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr_1.2fr]">
        <DebtList title="Yaklaşan Ödemeler" items={data?.upcomingDebts ?? []} />
        <DebtList title="Geciken Borçlar" items={data?.overdueDebts ?? []} overdue />
        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-bold">Son Hareketler</h2>
          </div>
          <div className="divide-y divide-line">
            {(data?.recentTransactions ?? []).map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 px-5 py-4 text-sm">
                <div>
                  <div className="font-semibold">{item.description}</div>
                  <div className="text-xs text-slate-500">{item.category?.name ?? 'Kategorisiz'} · {item.account.name} · {dateText(item.transactionDate)}</div>
                </div>
                <div className={`font-bold ${item.direction === 'IN' ? 'text-emerald-700' : item.direction === 'OUT' ? 'text-red-700' : ''}`}>{money(item.amount)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-bold">Yeni Gider Kategorisi</h2>
          <form onSubmit={addCategory} className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
            <input className="field" placeholder="Kategori adı" value={newCategory.name} onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })} required />
            <select className="field" value={newCategory.kind} onChange={(event) => setNewCategory({ ...newCategory, kind: event.target.value })}>
              <option value="EXPENSE">Gider</option>
              <option value="INCOME">Gelir</option>
              <option value="BOTH">İkisi</option>
            </select>
            <button className="btn btn-secondary"><Plus size={17} />Ekle</button>
          </form>
        </section>
        <section className="panel p-5">
          <h2 className="font-bold">Yeni Satış Kanalı</h2>
          <form onSubmit={addChannel} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input className="field" placeholder="Satış kanalı adı" value={newChannel} onChange={(event) => setNewChannel(event.target.value)} required />
            <button className="btn btn-secondary"><Plus size={17} />Ekle</button>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}

function MiniForm({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DebtList({ title, items, overdue = false }: { title: string; items: FinanceSummary['upcomingDebts']; overdue?: boolean }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        {overdue && <AlertTriangle size={18} className="text-red-700" />}
        <h2 className="font-bold">{title}</h2>
      </div>
      <div className="divide-y divide-line">
        {items.length === 0 && <div className="px-5 py-6 text-sm text-slate-500">Kayıt yok.</div>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
            <div>
              <div className="font-semibold">{item.title}</div>
              <div className="text-xs text-slate-500">{item.partyName ?? 'Genel'} · {dateText(item.dueDate)}</div>
            </div>
            <div className={overdue ? 'font-bold text-red-700' : 'font-bold'}>{money(item.remainingAmount)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function accountTypeLabel(type: Account['type']) {
  const labels: Record<Account['type'], string> = {
    BANK: 'Banka',
    CASH: 'Nakit kasa',
    CREDIT_CARD: 'Kredi kartı',
    MARKETPLACE_RECEIVABLE: 'Pazaryeri hakediş',
  };
  return labels[type];
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR')} TL`;
}

function dateText(value: string) {
  return new Date(value).toLocaleDateString('tr-TR');
}
