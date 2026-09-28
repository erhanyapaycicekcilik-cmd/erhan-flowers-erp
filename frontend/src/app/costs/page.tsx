'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type ProductCostRow = {
  id: number;
  productName: string;
  modelCode: string | null;
  status: string;
  imageUrl: string | null;
  costs: {
    totalCost: number;
    shopPrice: number;
    sitePrice: number;
    marketplacePrice: number;
  };
};

export default function CostsListPage() {
  const [rows, setRows] = useState<ProductCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    api<ProductCostRow[]>('/costs/products')
      .then(setRows)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.productName.toLowerCase().includes(q) || (r.modelCode ?? '').toLowerCase().includes(q));
    }
    if (filter === 'with') list = list.filter((r) => r.costs.totalCost > 0);
    if (filter === 'without') list = list.filter((r) => r.costs.totalCost === 0);
    return list;
  }, [rows, query, filter]);

  const withCost = rows.filter((r) => r.costs.totalCost > 0).length;
  const withoutCost = rows.filter((r) => r.costs.totalCost === 0).length;

  return (
    <AdminShell title="Toplu Maliyet Girişi">
      <div className="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-3">
        <StatCard label="Toplam Ürün" value={rows.length} />
        <StatCard label="Reçetesi Olan" value={withCost} color="green" />
        <StatCard label="Reçetesi Eksik" value={withoutCost} color="amber" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-8"
            placeholder="Ürün adı veya model kodu..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border border-line overflow-hidden text-sm">
          {(['all', 'with', 'without'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 ${filter === f ? 'bg-brand text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'all' ? 'Tümü' : f === 'with' ? 'Reçetesi Var' : 'Reçetesi Yok'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Yükleniyor…</div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Ürün</th>
                  <th className="px-5 py-3 text-right">Maliyet</th>
                  <th className="px-5 py-3 text-right">Dükkan</th>
                  <th className="px-5 py-3 text-right">Site</th>
                  <th className="px-5 py-3 text-right">Platform</th>
                  <th className="px-5 py-3 text-right">Durum</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-line hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.imageUrl}
                            alt={row.productName}
                            width={40}
                            height={40}
                            className="rounded-md object-cover bg-slate-100 flex-shrink-0 w-10 h-10"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-medium">{row.productName}</div>
                          {row.modelCode && <div className="text-xs text-slate-400">{row.modelCode}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {row.costs.totalCost > 0 ? <>{fmt(row.costs.totalCost)} ₺</> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {row.costs.shopPrice > 0 ? <>{fmt(row.costs.shopPrice)} ₺</> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {row.costs.sitePrice > 0 ? <>{fmt(row.costs.sitePrice)} ₺</> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-brand">
                      {row.costs.marketplacePrice > 0 ? <>{fmt(row.costs.marketplacePrice)} ₺</> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.costs.totalCost > 0
                        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={13} /> Var</span>
                        : <span className="text-xs text-amber-500">Eksik</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/costs/${row.id}`} className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium bg-brand text-white hover:opacity-90">
                        Düzenle <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Ürün bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'green' | 'amber' }) {
  const textColor = color === 'green' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-600' : 'text-slate-800';
  return (
    <div className="panel p-4">
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function fmt(v: number) {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
