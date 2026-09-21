'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingDown, TrendingUp, Package, Filter } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Movement = {
  id: number;
  type: 'IN' | 'OUT';
  quantity: number;
  unit: string;
  previousStock: number;
  nextStock: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  itemName: string | null;
  barcode: string | null;
  stockCardId: number | null;
  productId: number | null;
  saleNumber: string | null;
  customerName: string | null;
  channel: string | null;
  createdByName: string | null;
};

function fmt(d: string) {
  return new Date(d).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function channelLabel(ch: string | null) {
  if (!ch) return '';
  const map: Record<string, string> = {
    TRENDYOL: 'Trendyol', N11: 'N11', HEPSIBURADA: 'Hepsiburada',
    WEB: 'Website', SHOP: 'Dükkan', MANUAL: 'Manuel', PHONE: 'Telefon',
  };
  return map[ch] ?? ch;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function StokRaporuPage() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(weekAgoStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ dateFrom, dateTo, type: typeFilter, limit: '500' });
      const data = await api<Movement[]>(`/stock-cards/movements/report?${params}`);
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.itemName ?? '').toLowerCase().includes(q) ||
      (r.saleNumber ?? '').toLowerCase().includes(q) ||
      (r.customerName ?? '').toLowerCase().includes(q) ||
      (r.reason ?? '').toLowerCase().includes(q) ||
      (r.barcode ?? '').toLowerCase().includes(q)
    );
  });

  const outTotal = filtered.filter(r => r.type === 'OUT').reduce((s, r) => s + r.quantity, 0);
  const inTotal = filtered.filter(r => r.type === 'IN').reduce((s, r) => s + r.quantity, 0);

  return (
    <AdminShell>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package size={22} /> Stok Hareket Raporu
          </h1>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Yenile
          </button>
        </div>

        {/* Filtreler */}
        <div className="flex flex-wrap gap-3 bg-gray-50 p-3 rounded-lg border">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Filter size={14} /> Filtrele:
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border rounded px-2 py-1 text-sm" />
          <span className="text-sm self-center text-gray-400">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border rounded px-2 py-1 text-sm" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border rounded px-2 py-1 text-sm">
            <option value="all">Tümü (Giriş + Çıkış)</option>
            <option value="OUT">Sadece Çıkış</option>
            <option value="IN">Sadece Giriş</option>
          </select>
          <input
            type="text" placeholder="Ürün, sipariş no, müşteri..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-2 py-1 text-sm min-w-[200px]"
          />
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border rounded-lg p-3 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Package size={20} className="text-blue-500" /></div>
            <div><div className="text-2xl font-bold">{filtered.length}</div><div className="text-xs text-gray-500">Hareket</div></div>
          </div>
          <div className="bg-white border rounded-lg p-3 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><TrendingDown size={20} className="text-red-500" /></div>
            <div><div className="text-2xl font-bold text-red-600">{outTotal.toLocaleString('tr-TR')}</div><div className="text-xs text-gray-500">Toplam Çıkış</div></div>
          </div>
          <div className="bg-white border rounded-lg p-3 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp size={20} className="text-green-500" /></div>
            <div><div className="text-2xl font-bold text-green-600">{inTotal.toLocaleString('tr-TR')}</div><div className="text-xs text-gray-500">Toplam Giriş</div></div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}

        {/* Tablo */}
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Saat</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Ürün</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Hareket</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Miktar</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Önceki</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Sonraki</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Sipariş</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Müşteri</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Kanal</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Yükleniyor...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Hareket bulunamadı</td></tr>
              )}
              {filtered.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">{fmt(row.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.itemName ?? '—'}</div>
                    {row.barcode && <div className="text-xs text-gray-400">{row.barcode}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {row.type === 'OUT'
                      ? <span className="inline-flex items-center gap-1 text-red-600 font-medium"><TrendingDown size={14} />Çıkış</span>
                      : <span className="inline-flex items-center gap-1 text-green-600 font-medium"><TrendingUp size={14} />Giriş</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    <span className={row.type === 'OUT' ? 'text-red-600' : 'text-green-600'}>
                      {row.type === 'OUT' ? '-' : '+'}{row.quantity} {row.unit}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">{row.previousStock}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${row.nextStock <= 0 ? 'text-red-600' : ''}`}>
                    {row.nextStock}
                    {row.nextStock <= 0 && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1 rounded">Bitti!</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.saleNumber
                      ? <span className="text-blue-600 font-mono text-xs">{row.saleNumber}</span>
                      : <span className="text-gray-400 text-xs">{row.referenceId ?? '—'}</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-xs">{row.customerName ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.channel && (
                      <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">{channelLabel(row.channel)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">{row.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 text-right">{filtered.length} kayıt gösteriliyor (max 500)</div>
      </div>
    </AdminShell>
  );
}
