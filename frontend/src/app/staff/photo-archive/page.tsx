'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, Image, Calendar } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiBaseUrl } from '@/lib/api';

type PhotoRow = {
  sale_id: number;
  sale_number: string;
  customer_name: string;
  channel: string;
  image_path: string;
  photo_type: string;
  created_at: string;
  expires_at: string;
};

function photoUrl(imagePath: string) {
  return `${apiBaseUrl}/${imagePath}`;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PhotoArchivePage() {
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [saleNumber, setSaleNumber] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 45);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<PhotoRow | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customerName) params.set('customerName', customerName);
      if (saleNumber) params.set('saleNumber', saleNumber);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('limit', '100');
      const data = await api<PhotoRow[]>(`/sales/proof-photos/archive?${params}`);
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [customerName, saleNumber, dateFrom, dateTo]);

  useEffect(() => { void search(); }, []);

  const channelColor: Record<string, string> = {
    TRENDYOL: 'bg-orange-100 text-orange-700',
    HEPSIBURADA: 'bg-red-100 text-red-700',
    N11: 'bg-blue-100 text-blue-700',
  };

  return (
    <AdminShell title="Fotoğraf Arşivi">
      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Image size={22} className="text-indigo-600" />
            Fotoğraf Arşivi
          </h1>
          <span className="text-sm text-slate-500">Son 90 gün içindeki hazırlık fotoğrafları</span>
        </div>

        {/* Filtreler */}
        <div className="panel p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="field pl-9 w-full"
                placeholder="Müşteri adı..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void search()}
              />
            </div>
            <input
              className="field w-full"
              placeholder="Sipariş no..."
              value={saleNumber}
              onChange={(e) => setSaleNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void search()}
            />
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" className="field text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span className="text-slate-400 text-sm">—</span>
              <input type="date" className="field text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <button onClick={() => void search()} disabled={loading} className="btn btn-primary text-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Aranıyor...' : 'Ara'}
            </button>
          </div>
        </div>

        {/* Sonuçlar */}
        <div className="text-sm text-slate-500">{rows.length} fotoğraf bulundu</div>

        {rows.length === 0 && !loading && (
          <div className="text-center text-slate-400 py-16">
            <Image size={48} className="mx-auto mb-3 opacity-30" />
            <p>Fotoğraf bulunamadı</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {rows.map((row, i) => (
            <button
              key={i}
              onClick={() => setSelected(row)}
              className="panel overflow-hidden text-left hover:shadow-md transition group"
            >
              <div className="aspect-square bg-slate-100 overflow-hidden">
                <img
                  src={photoUrl(row.image_path)}
                  alt={row.customer_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="p-2 space-y-1">
                <div className="font-semibold text-xs truncate">{row.customer_name || '—'}</div>
                <div className="text-[10px] text-slate-500">{row.sale_number}</div>
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${channelColor[row.channel] ?? 'bg-slate-100 text-slate-600'}`}>
                    {row.channel}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(row.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {selected && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <div className="bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <img src={photoUrl(selected.image_path)} alt="" className="w-full" />
              <div className="p-4 space-y-1">
                <div className="font-bold text-lg">{selected.customer_name}</div>
                <div className="text-sm text-slate-500">{selected.sale_number} · {selected.channel}</div>
                <div className="text-xs text-slate-400">Çekildi: {fmt(selected.created_at)}</div>
                <div className="text-xs text-slate-400">Son geçerlilik: {fmt(selected.expires_at)}</div>
                <div className="flex gap-2 pt-2">
                  <a
                    href={photoUrl(selected.image_path)}
                    download
                    className="btn btn-secondary text-sm flex-1 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    İndir
                  </a>
                  <button onClick={() => setSelected(null)} className="btn btn-primary text-sm flex-1">
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
