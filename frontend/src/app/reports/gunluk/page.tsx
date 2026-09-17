'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, ShoppingCart, Package, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

type StockOut = { name: string; quantity: number; unit: string; unitCost: number; totalCost: number; reason: string };
type TopProduct = { name: string; quantity: number };
type ByPlatform = Record<string, { orders: number; revenue: number }>;

type DailyReport = {
  date: string;
  revenue: { total: number; marketplace: number; retail: number };
  orders: { total: number; marketplace: number; retail: number };
  byPlatform: ByPlatform;
  stockOut: StockOut[];
  cost: number;
  estimatedProfit: number;
  topProducts: TopProduct[];
};

function money(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function GunlukRaporPage() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = addDays(today, -1);
  const [date, setDate] = useState(yesterday);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api<DailyReport>(`/dashboard/daily-report?date=${date}`)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <AdminShell title="Günlük Rapor">
      {/* Tarih seçici */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setDate(addDays(date, -1))}
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          className="field"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= today}
        >
          <ChevronRight size={18} />
        </button>
        <span className="text-sm font-medium text-slate-600">
          {report ? fmt(report.date) : ''}
        </span>
      </div>

      {loading && <div className="py-20 text-center text-slate-400">Yükleniyor...</div>}

      {!loading && report && (
        <div className="space-y-6">
          {/* Üst kartlar */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Toplam Ciro"
              value={money(report.revenue.total)}
              icon={<TrendingUp size={20} className="text-emerald-500" />}
              color="emerald"
            />
            <StatCard
              label="Sipariş Sayısı"
              value={String(report.orders.total)}
              icon={<ShoppingCart size={20} className="text-blue-500" />}
              color="blue"
            />
            <StatCard
              label="Malzeme Maliyeti"
              value={money(report.cost)}
              icon={<Package size={20} className="text-amber-500" />}
              color="amber"
            />
            <StatCard
              label="Tahmini Kar"
              value={money(report.estimatedProfit)}
              icon={<BarChart3 size={20} className={report.estimatedProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} />}
              color={report.estimatedProfit >= 0 ? 'emerald' : 'red'}
            />
          </div>

          {/* Platform bazında */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-bold text-slate-800">Platform Bazında Satışlar</h3>
            {Object.keys(report.byPlatform).length === 0 ? (
              <p className="text-sm text-slate-400">Bu gün için satış kaydı yok.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase text-slate-400">
                    <th className="pb-2">Platform</th>
                    <th className="pb-2 text-right">Sipariş</th>
                    <th className="pb-2 text-right">Ciro</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.byPlatform).map(([platform, data]) => (
                    <tr key={platform} className="border-b border-slate-50">
                      <td className="py-2 font-medium">{platform}</td>
                      <td className="py-2 text-right text-slate-600">{data.orders}</td>
                      <td className="py-2 text-right font-semibold text-emerald-700">{money(data.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* En çok satan ürünler */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 font-bold text-slate-800">En Çok Düşen Stoklar</h3>
              {report.topProducts.length === 0 ? (
                <p className="text-sm text-slate-400">Bu gün için stok hareketi yok.</p>
              ) : (
                <div className="space-y-2">
                  {report.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex-1 truncate text-slate-700">{p.name}</span>
                      <span className="ml-3 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {p.quantity} adet
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stok çıkışları */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 font-bold text-slate-800">Stok Çıkışları & Maliyet</h3>
              {report.stockOut.length === 0 ? (
                <p className="text-sm text-slate-400">Bu gün için stok çıkışı yok.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-left font-semibold uppercase text-slate-400">
                        <th className="pb-2">Ürün</th>
                        <th className="pb-2 text-right">Miktar</th>
                        <th className="pb-2 text-right">Maliyet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.stockOut.map((s, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-1.5 font-medium text-slate-700">{s.name}</td>
                          <td className="py-1.5 text-right text-slate-500">{s.quantity} {s.unit}</td>
                          <td className="py-1.5 text-right font-semibold text-amber-700">{money(s.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td colSpan={2} className="pt-2 font-bold text-slate-700">Toplam Maliyet</td>
                        <td className="pt-2 text-right font-bold text-amber-700">{money(report.cost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Kar özeti */}
          <div className={`rounded-xl border p-5 ${report.estimatedProfit >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600">Tahmini Net Kar</p>
                <p className="text-xs text-slate-400">Ciro ({money(report.revenue.total)}) − Malzeme Maliyeti ({money(report.cost)})</p>
              </div>
              <div className={`text-2xl font-bold ${report.estimatedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {money(report.estimatedProfit)}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && report && report.orders.total === 0 && report.stockOut.length === 0 && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 py-16 text-center">
          <p className="text-slate-400">Bu tarih için kayıt bulunamadı.</p>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const bg: Record<string, string> = { emerald: 'bg-emerald-50', blue: 'bg-blue-50', amber: 'bg-amber-50', red: 'bg-red-50' };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${bg[color] ?? 'bg-slate-50'}`}>{icon}</div>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
