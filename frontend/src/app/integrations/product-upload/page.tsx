'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Send, RefreshCw, CheckCircle2, XCircle, AlertCircle, Search } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';

const PLATFORMS = ['TRENDYOL', 'HEPSIBURADA', 'N11'] as const;
type Platform = (typeof PLATFORMS)[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'N11',
};

type Product = {
  id: number;
  variantId: number;
  productName: string;
  barcode: string;
  modelCode: string;
  salePrice: number;
  stockQuantity: number;
  images: string[];
};

type PushResult = { platform: Platform; barcode: string; ok: boolean; message?: string };

export default function ProductUploadPage() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(PLATFORMS));
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [results, setResults] = useState<PushResult[]>([]);
  const [page, setPage] = useState(1);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`${API}/products/variants?${params}`, { credentials: 'include' });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : (data.items ?? []));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  function toggleAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.variantId)));
    }
  }

  function toggleProduct(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePlatform(p: Platform) {
    setPlatforms((s) => {
      const next = new Set(s);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  async function broadcastSelected() {
    if (!selected.size || !platforms.size) return;
    setBroadcasting(true);
    setResults([]);
    const selectedProducts = products.filter((p) => selected.has(p.variantId));
    const newResults: PushResult[] = [];

    for (const platform of Array.from(platforms)) {
      for (const product of selectedProducts) {
        const identifier = product.barcode || product.modelCode;
        try {
          const res = await fetch(`${API}/integrations/products/${platform}/price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              barcode: identifier,
              salePrice: product.salePrice,
              stockQuantity: product.stockQuantity,
            }),
          });
          const data = await res.json();
          newResults.push({ platform, barcode: identifier, ok: res.ok && !data.error, message: data.message ?? data.error });
        } catch (e) {
          newResults.push({ platform, barcode: identifier, ok: false, message: String(e) });
        }
      }
    }
    setResults(newResults);
    setBroadcasting(false);
  }

  async function broadcastAll() {
    if (!platforms.size) return;
    setBroadcasting(true);
    setResults([]);
    try {
      const res = await fetch(`${API}/products/broadcast-all`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setResults([{ platform: 'TRENDYOL', barcode: 'Tümü', ok: res.ok, message: data.message ?? JSON.stringify(data) }]);
    } catch (e) {
      setResults([{ platform: 'TRENDYOL', barcode: 'Tümü', ok: false, message: String(e) }]);
    } finally {
      setBroadcasting(false);
    }
  }

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  return (
    <AdminShell>
      <div className="px-4 py-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-slate-800">Ürün Yükleme / Platform Gönderimi</h1>
          <button
            onClick={broadcastAll}
            disabled={broadcasting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            <Send size={14} />
            {broadcasting ? 'Gönderiliyor…' : 'Tüm Ürünleri Gönder'}
          </button>
        </div>

        {/* Platform seçimi */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-600 font-medium">Platformlar:</span>
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={`px-3 py-1 text-sm rounded-full border font-medium transition-colors ${platforms.has(p) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Arama + filtre */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm"
              placeholder="Ürün adı, barkod veya model kodu ara…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Toplu işlem çubuğu */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-blue-800">{selected.size} ürün seçildi</span>
            <button
              onClick={broadcastSelected}
              disabled={broadcasting || !platforms.size}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={13} />
              {broadcasting ? 'Gönderiliyor…' : `Seçilileri Gönder (${Array.from(platforms).map(p => PLATFORM_LABELS[p]).join(', ')})`}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-blue-600 hover:underline ml-auto">Temizle</button>
          </div>
        )}

        {/* Sonuçlar */}
        {results.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
              <span className="text-sm font-medium text-slate-700">Sonuçlar</span>
              {successCount > 0 && <span className="flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 size={12} /> {successCount} başarılı</span>}
              {failCount > 0 && <span className="flex items-center gap-1 text-red-600 text-xs"><XCircle size={12} /> {failCount} hatalı</span>}
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
                  {r.ok ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> : <XCircle size={14} className="text-red-500 shrink-0" />}
                  <span className="text-slate-500 w-28 shrink-0">{PLATFORM_LABELS[r.platform]}</span>
                  <span className="text-slate-700 font-mono text-xs w-36 shrink-0 truncate">{r.barcode}</span>
                  {r.message && <span className="text-slate-500 text-xs truncate">{r.message}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ürün listesi */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left w-8">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selected.size === products.length}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Ürün</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Barkod</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Fiyat</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Yükleniyor…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Ürün bulunamadı</td></tr>
              ) : products.map((p) => (
                <tr
                  key={p.variantId}
                  onClick={() => toggleProduct(p.variantId)}
                  className={`cursor-pointer hover:bg-slate-50 ${selected.has(p.variantId) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.variantId)}
                      onChange={() => toggleProduct(p.variantId)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800 truncate max-w-xs">{p.productName}</div>
                    <div className="text-xs text-slate-400">{p.modelCode}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{p.barcode || '-'}</td>
                  <td className="px-3 py-2 text-right text-slate-700 font-medium">
                    {p.salePrice ? `₺${p.salePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={p.stockQuantity <= 0 ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                      {p.stockQuantity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            ← Önceki
          </button>
          <span className="text-sm text-slate-500">Sayfa {page}</span>
          <button
            disabled={products.length < 50}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            Sonraki →
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
