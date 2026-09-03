'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Link2, CheckCircle2, AlertTriangle, Search, RefreshCw } from 'lucide-react';

interface UnmatchedSku {
  sku: string;
  barcode: string | null;
  orderCount: number;
}

interface StockCard {
  id: number;
  sku: string;
  name: string;
}

interface SavedMapping {
  id: number;
  external_sku: string;
  external_barcode: string | null;
  stock_card_id: number;
  sku: string;
  name: string;
}

const PLATFORMS = [
  { code: 'TRENDYOL', label: 'Trendyol' },
  { code: 'N11', label: 'N11' },
];

export default function SkuMappingPage() {
  const [platform, setPlatform] = useState('TRENDYOL');
  const [unmatched, setUnmatched] = useState<UnmatchedSku[]>([]);
  const [mappings, setMappings] = useState<SavedMapping[]>([]);
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [search, setSearch] = useState('');
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ updated: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, m, sc] = await Promise.all([
        api<UnmatchedSku[]>(`/integrations/sku-mappings/unmatched?platform=${platform}`),
        api<SavedMapping[]>(`/integrations/sku-mappings?platform=${platform}`),
        api<StockCard[]>('/stock-cards?limit=2000'),
      ]);
      setUnmatched(u);
      setMappings(m);
      setStockCards(sc as unknown as StockCard[]);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => { void load(); }, [load]);

  async function saveMapping(externalSku: string, externalBarcode: string | null) {
    const stockCardId = selections[externalSku];
    if (!stockCardId) return;
    setSaving(externalSku);
    try {
      await api('/integrations/sku-mappings', {
        method: 'POST',
        json: { platform, externalSku, externalBarcode: externalBarcode ?? undefined, stockCardId },
      });
      await load();
    } finally {
      setSaving(null);
    }
  }

  async function applyRetroactive() {
    setApplying(true);
    setApplyResult(null);
    try {
      const result = await api<{ updated: number }>('/integrations/sku-mappings/apply-retroactive', { method: 'POST' });
      setApplyResult(result);
    } finally {
      setApplying(false);
    }
  }

  const filteredUnmatched = unmatched.filter(
    (u) => !search || u.sku.toLowerCase().includes(search.toLowerCase()) || (u.barcode ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const filteredCards = (query: string) =>
    stockCards
      .filter((c) => c.sku.toLowerCase().includes(query.toLowerCase()) || c.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 50);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 size={22} className="text-brand" />
          <div>
            <h1 className="text-xl font-bold">SKU Eşleştirme</h1>
            <p className="text-sm text-slate-500">Pazaryeri ürünlerini ERP stok kartlarıyla eşleştir</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.code}
              onClick={() => setPlatform(p.code)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${platform === p.code ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {p.label}
            </button>
          ))}
          <button onClick={() => void load()} className="btn btn-secondary text-sm flex items-center gap-1">
            <RefreshCw size={14} /> Yenile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="panel p-4">
          <div className="text-2xl font-bold text-red-500">{unmatched.length}</div>
          <div className="text-sm text-slate-500 mt-1">Eşleşmeyen SKU</div>
        </div>
        <div className="panel p-4">
          <div className="text-2xl font-bold text-green-600">{mappings.length}</div>
          <div className="text-sm text-slate-500 mt-1">Kayıtlı Eşleştirme</div>
        </div>
        <div className="panel p-4">
          <div className="text-2xl font-bold text-slate-700">{unmatched.reduce((s, u) => s + u.orderCount, 0)}</div>
          <div className="text-sm text-slate-500 mt-1">Etkilenen Sipariş Satırı</div>
        </div>
      </div>

      {/* Retroactive apply */}
      {mappings.length > 0 && (
        <div className="panel p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Geçmiş siparişlere uygula</div>
            <div className="text-xs text-slate-500">Yeni eklediğin eşleştirmeleri geçmiş sipariş satırlarına da uygular</div>
          </div>
          <div className="flex items-center gap-3">
            {applyResult && (
              <span className="text-sm text-green-600 font-semibold">
                <CheckCircle2 size={14} className="inline mr-1" />{applyResult.updated} satır güncellendi
              </span>
            )}
            <button onClick={() => void applyRetroactive()} disabled={applying} className="btn btn-primary text-sm">
              {applying ? 'Uygulanıyor...' : 'Uygula'}
            </button>
          </div>
        </div>
      )}

      {/* Unmatched SKUs */}
      {loading ? (
        <div className="panel p-8 text-center text-slate-400">Yükleniyor...</div>
      ) : unmatched.length === 0 ? (
        <div className="panel p-8 text-center">
          <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
          <div className="font-semibold text-green-700">Tüm SKU'lar eşleştirilmiş!</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="p-4 border-b border-line flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="font-semibold text-sm">Eşleşmeyen SKU'lar ({unmatched.length})</span>
            <div className="ml-auto relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="field pl-8 py-1.5 text-sm w-52"
                placeholder="SKU veya barkod ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y divide-line">
            {filteredUnmatched.map((u) => (
              <SkuRow
                key={u.sku}
                item={u}
                stockCards={stockCards}
                filteredCards={filteredCards}
                selectedId={selections[u.sku]}
                onSelect={(id) => setSelections((s) => ({ ...s, [u.sku]: id }))}
                onSave={() => void saveMapping(u.sku, u.barcode)}
                saving={saving === u.sku}
              />
            ))}
          </div>
        </div>
      )}

      {/* Existing mappings */}
      {mappings.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="p-4 border-b border-line font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" /> Kayıtlı Eşleştirmeler
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Pazaryeri SKU</th>
                <th className="px-4 py-2 text-left">Barkod</th>
                <th className="px-4 py-2 text-left">ERP Stok Kodu</th>
                <th className="px-4 py-2 text-left">Ürün Adı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono">{m.external_sku}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{m.external_barcode ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-brand">{m.sku}</td>
                  <td className="px-4 py-2">{m.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function SkuRow({
  item,
  stockCards,
  filteredCards,
  selectedId,
  onSelect,
  onSave,
  saving,
}: {
  item: UnmatchedSku;
  stockCards: StockCard[];
  filteredCards: (q: string) => StockCard[];
  selectedId: number | undefined;
  onSelect: (id: number) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const results = query.length > 0 ? filteredCards(query) : stockCards.slice(0, 30);
  const selected = stockCards.find((c) => c.id === selectedId);

  return (
    <div className="p-4 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-[200px]">
        <div className="font-mono font-semibold">{item.sku}</div>
        {item.barcode && <div className="text-xs text-slate-400 mt-0.5">{item.barcode}</div>}
      </div>
      <div className="text-xs text-slate-500 whitespace-nowrap">
        {item.orderCount} sipariş
      </div>
      <div className="relative w-64">
        <input
          className="field text-sm py-1.5"
          placeholder="ERP ürünü ara..."
          value={selected ? `${selected.sku} — ${selected.name}` : query}
          onFocus={() => { setQuery(''); setOpen(true); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (selectedId) onSelect(0); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-line rounded-md shadow-lg max-h-48 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">Sonuç yok</div>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand hover:text-white transition"
                  onMouseDown={() => { onSelect(c.id); setQuery(''); setOpen(false); }}
                >
                  <span className="font-mono">{c.sku}</span> — {c.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={!selectedId || saving}
        className="btn btn-primary text-sm py-1.5 disabled:opacity-40"
      >
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  );
}
