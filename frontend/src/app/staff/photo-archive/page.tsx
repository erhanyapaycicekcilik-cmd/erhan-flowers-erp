'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, Image, Calendar, Video, Download, X } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiBaseUrl } from '@/lib/api';

type PhotoRow = {
  sale_id: number;
  sale_number: string;
  customer_name: string;
  channel: string;
  image_path: string;
  thumbnail_path?: string | null;
  photo_type: string;
  created_at: string;
  expires_at: string;
  product_names?: string | null;
};

function mediaUrl(imagePath: string) {
  return `${apiBaseUrl}/${imagePath}`;
}

function isVideo(path: string) {
  return /\.(mp4|mov|avi|webm|mkv|m4v|3gp)$/i.test(path);
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PhotoArchivePage() {
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saleNumber, setSaleNumber] = useState('');
  const [productName, setProductName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 45);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<PhotoRow | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (customerName) params.set('customerName', customerName);
      if (saleNumber) params.set('saleNumber', saleNumber);
      if (productName) params.set('productName', productName);
      if (barcode) params.set('barcode', barcode);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('limit', '100');
      const data = await api<PhotoRow[]>(`/sales/proof-photos/archive?${params}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [customerName, saleNumber, productName, barcode, dateFrom, dateTo]);

  useEffect(() => { void search(); }, []);

  const channelColor: Record<string, string> = {
    TRENDYOL: 'bg-orange-100 text-orange-700',
    HEPSIBURADA: 'bg-red-100 text-red-700',
    N11: 'bg-blue-100 text-blue-700',
  };

  const photoTypeLabel: Record<string, string> = {
    BARCODE: 'Barkod',
    PACKAGE: 'Kargo',
    PRODUCT: 'Ürün',
    READY: 'Hazırlık',
  };

  const videoCount = rows.filter(r => isVideo(r.image_path)).length;
  const photoCount = rows.length - videoCount;

  return (
    <AdminShell title="Medya Arşivi">
      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Image size={22} className="text-indigo-600" />
            Fotoğraf & Video Arşivi
          </h1>
          <span className="text-sm text-slate-500">Son 90 gün · Sipariş no ile arama yapabilirsiniz</span>
        </div>

        {/* Filtreler */}
        <div className="panel p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="field pl-9 w-full" placeholder="Müşteri adı..." value={customerName}
                onChange={(e) => setCustomerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} />
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="field pl-9 w-full" placeholder="Sipariş no (EF-2026-000001)..." value={saleNumber}
                onChange={(e) => setSaleNumber(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} />
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="field pl-9 w-full" placeholder="Ürün adı..." value={productName}
                onChange={(e) => setProductName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} />
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="field pl-9 w-full" placeholder="Barkod..." value={barcode}
                onChange={(e) => setBarcode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} />
            </div>
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

        {/* Sayım */}
        {rows.length > 0 && (
          <div className="flex gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Image size={13} /> {photoCount} fotoğraf</span>
            {videoCount > 0 && <span className="flex items-center gap-1 text-blue-600"><Video size={13} /> {videoCount} video</span>}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <strong>Hata:</strong> {error}
          </div>
        )}
        {rows.length === 0 && !loading && !error && (
          <div className="text-center text-slate-400 py-16">
            <Image size={48} className="mx-auto mb-3 opacity-30" />
            <p>Medya bulunamadı — personel henüz fotoğraf yüklememiş olabilir</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {rows.map((row, i) => {
            const video = isVideo(row.image_path);
            return (
              <button
                key={i}
                onClick={() => setSelected(row)}
                className="panel overflow-hidden text-left hover:shadow-md transition group"
              >
                <div className="aspect-square bg-slate-100 overflow-hidden relative flex items-center justify-center">
                  {video ? (
                    <>
                      {row.thumbnail_path ? (
                        <img
                          src={mediaUrl(row.thumbnail_path)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <Video size={32} className="text-slate-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="bg-white/90 rounded-full p-2">
                          <Video size={20} className="text-slate-800" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={mediaUrl(row.image_path)}
                      alt={row.customer_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="p-2 space-y-1">
                  <div className="font-semibold text-xs truncate">{row.customer_name || '—'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{row.sale_number}</div>
                  {row.product_names && (
                    <div className="text-[10px] text-slate-400 truncate">{row.product_names}</div>
                  )}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${channelColor[row.channel] ?? 'bg-slate-100 text-slate-600'}`}>
                        {row.channel}
                      </span>
                      {row.photo_type && row.photo_type !== 'BARCODE' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {photoTypeLabel[row.photo_type] ?? row.photo_type}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{new Date(row.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Lightbox */}
        {selected && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {isVideo(selected.image_path) ? (
                <video
                  src={mediaUrl(selected.image_path)}
                  controls
                  autoPlay
                  className="w-full max-h-[60vh] bg-black"
                />
              ) : (
                <img src={mediaUrl(selected.image_path)} alt="" className="w-full max-h-[60vh] object-contain bg-black" />
              )}
              <div className="p-4 space-y-1">
                <div className="font-bold text-lg">{selected.customer_name}</div>
                <div className="text-sm text-slate-500 font-mono">{selected.sale_number} · {selected.channel}</div>
                {selected.product_names && (
                  <div className="text-sm text-slate-600">{selected.product_names}</div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">Çekildi: {fmt(selected.created_at)}</span>
                  {selected.photo_type && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {photoTypeLabel[selected.photo_type] ?? selected.photo_type}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">Son geçerlilik: {fmt(selected.expires_at)}</div>
                <div className="flex gap-2 pt-2">
                  <a
                    href={mediaUrl(selected.image_path)}
                    download
                    className="btn btn-secondary text-sm flex-1 text-center flex items-center justify-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={13} /> İndir
                  </a>
                  <button onClick={() => setSelected(null)} className="btn btn-primary text-sm flex-1 flex items-center justify-center gap-1">
                    <X size={13} /> Kapat
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
