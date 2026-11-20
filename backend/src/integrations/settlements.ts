/**
 * Trendyol cari hesap ekstresi kayıtlarını hakediş özetine çevirir (saf fonksiyonlar — test edilebilir).
 *
 * Kayıt alanları (Trendyol finans servisi): transactionDate, transactionType, debt, credit, commissionAmount,
 * sellerRevenue, orderNumber, paymentOrderId, paymentDate, description, receiptId.
 * İşaretler tipten tipe değişebildiği için tutarlar mutlak değerle alınır, yönü işlem tipi belirler.
 */

export type FinanceRecord = Record<string, any>;

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const abs = (v: unknown) => Math.abs(num(v));
const r2 = (n: number) => Math.round(n * 100) / 100;
const trDay = (ms: unknown) => {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n + 3 * 3600000).toISOString().slice(0, 10);
};

/** Satış yönündeki tipler (+), iade yönündekiler (−) */
const POSITIVE = new Set(['Sale', 'DiscountCancel', 'CouponCancel', 'ProvisionPositive', 'ManualRefundCancel']);
const NEGATIVE = new Set(['Return', 'Discount', 'Coupon', 'ProvisionNegative', 'ManualRefund']);

export type SettlementSummary = {
  sales: number;
  returns: number;
  discounts: number;
  commission: number;
  sellerRevenue: number;
  deductions: number;
  deductionsByType: Array<{ label: string; amount: number; count: number }>;
  net: number;
  payouts: Array<{ date: string | null; amount: number; paymentOrderId: string | null; description: string | null }>;
  payoutTotal: number;
  upcoming: Array<{ date: string; amount: number; count: number }>;
  orderCount: number;
};

export function summarizeSettlements(settlements: FinanceRecord[], payments: FinanceRecord[], deductions: FinanceRecord[], todayIso: string): SettlementSummary {
  let sales = 0, returns = 0, discounts = 0, commission = 0, sellerRevenue = 0;
  const orders = new Set<string>();
  const upcomingMap = new Map<string, { amount: number; count: number }>();

  for (const r of settlements) {
    const type = String(r.transactionType ?? '');
    const amount = abs(r.credit) || abs(r.debt);
    const rev = abs(r.sellerRevenue);
    const com = abs(r.commissionAmount);
    let sign = 0;
    if (POSITIVE.has(type)) sign = 1;
    else if (NEGATIVE.has(type)) sign = -1;
    else sign = num(r.credit) - num(r.debt) >= 0 ? 1 : -1;

    if (type === 'Sale') { sales += amount; if (r.orderNumber) orders.add(String(r.orderNumber)); }
    else if (type === 'Return') returns += amount;
    else discounts += sign * amount;

    if (type === 'Sale') commission += com;
    else if (type === 'Return') commission -= com;

    // Satıcı hakedişi: alan doluysa onu, değilse tutar − komisyon
    const revenue = rev || Math.max(amount - com, 0);
    sellerRevenue += sign * revenue;

    // Henüz ödenmemiş (ödeme emri yok) ve vadesi bugün/sonra olan → beklenen ödeme
    const pay = trDay(r.paymentDate);
    if (pay && pay >= todayIso && !r.paymentOrderId) {
      const u = upcomingMap.get(pay) ?? { amount: 0, count: 0 };
      u.amount += sign * revenue;
      u.count += 1;
      upcomingMap.set(pay, u);
    }
  }

  const dedMap = new Map<string, { amount: number; count: number }>();
  let deductionTotal = 0;
  for (const d of deductions) {
    const amount = abs(d.debt) || abs(d.credit);
    deductionTotal += amount;
    const label = String(d.description ?? d.transactionType ?? 'Kesinti').trim() || 'Kesinti';
    const g = dedMap.get(label) ?? { amount: 0, count: 0 };
    g.amount += amount;
    g.count += 1;
    dedMap.set(label, g);
  }

  const payouts = payments
    .map((p) => ({
      date: trDay(p.transactionDate ?? p.paymentDate),
      amount: r2(abs(p.debt) || abs(p.credit)),
      paymentOrderId: p.paymentOrderId != null ? String(p.paymentOrderId) : (p.receiptId != null ? String(p.receiptId) : null),
      description: p.description ?? null,
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    sales: r2(sales),
    returns: r2(returns),
    discounts: r2(discounts),
    commission: r2(commission),
    sellerRevenue: r2(sellerRevenue),
    deductions: r2(deductionTotal),
    deductionsByType: [...dedMap.entries()].map(([label, v]) => ({ label, amount: r2(v.amount), count: v.count })).sort((a, b) => b.amount - a.amount),
    net: r2(sellerRevenue - deductionTotal),
    payouts,
    payoutTotal: r2(payouts.reduce((s, p) => s + p.amount, 0)),
    upcoming: [...upcomingMap.entries()].map(([date, v]) => ({ date, amount: r2(v.amount), count: v.count })).sort((a, b) => a.date.localeCompare(b.date)),
    orderCount: orders.size,
  };
}
