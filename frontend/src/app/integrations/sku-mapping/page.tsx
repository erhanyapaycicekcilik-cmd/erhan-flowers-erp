'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api, apiBaseUrl } from '@/lib/api';
import { ChevronDown, ChevronRight, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Package, Download, Upload } from 'lucide-react';

interface SkuRow {
  sku: string;
  barcode: string | null;
  orderCount: number;
  components: Component[];
  singleMapping: { stock_card_id: number; sku: string; name: string } | null;
}

interface Component {
  id?: number;
  stock_card_id: number;
  quantity: number;
  sku: string;
  name: string;
  unit: string;
}

interface StockCard {
  id: number;
  sku: string;
  name: string;
  unit: string;
  stockQuantity: number;
}

const PLATFORMS = [{ code: 'TRENDYOL', label: 'Trendyol' }, { code: 'N11', label: 'N11' }];

export default function SkuMappingPage() {
  const [platform, setPlatform] = useState('TRENDYOL');
  const [rows, setRows] = useState<SkuRow[]>([]);
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, sc] = await Promise.all([
        api<SkuRow[]>(`/integrations/sku-mappings/all?platform=${platform}`),
        api<StockCard[]>('/stock-cards?limit=2000'),
      ]);
      setRows(r);
      setStockCards(sc as unknown as StockCard[]);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => { void load(); }, [load]);

  async function downloadTemplate() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token') ?? '' : '';
    const res = await fetch(`${apiBaseUrl}/integrations/sku-mappings/excel-template?platform=${platform}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${platform.toLowerCase()}-sku-eslestirme.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  async function importExcel(file: File) {
    setImporting(true); setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token') ?? '' : '';
      const res = await fetch(`${apiBaseUrl}/integrations/sku-mappings/excel-import?platform=${platform}`, {
        method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { message: string };
      setImportResult(data.message);
      await load();
    } finally { setImporting(false); }
  }

  async function triggerSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await api<{ processed: number; newOrders: number; stockDeductions: number }>('/integrations/orders/sync', { method: 'POST' });
      setSyncResult(`${r.newOrders} yeni sipariş, ${r.stockDeductions} stok düşümü`);
      await load();
    } finally {
      setSyncing(false);
    }
  }

  const matched = rows.filter(r => r.components.length > 0 || r.singleMapping);
  const unmatched = rows.filter(r => r.components.length === 0 && !r.singleMapping);

  return (
    <main className="p-5 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">SKU Eşleştirme</h1>
          <p className="text-sm text-slate-500">Trendyol/N11 ürünlerini ERP bileşenleriyle eşleştir — sipariş gelince stok otomatik düşer</p>
        </div>
        <div className="flex items-center gap-2">
          {PLATFORMS.map(p => (
            <button key={p.code} onClick={() => setPlatform(p.code)}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition ${platform === p.code ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {p.label}
            </button>
          ))}
          <button onClick={() => void load()} className="btn btn-secondary text-sm"><RefreshCw size={14} /></button>
          <button onClick={() => void downloadTemplate()} className="btn btn-secondary text-sm"><Download size={14} /> Excel Şablonu</button>
          <label className="btn btn-secondary text-sm cursor-pointer">
            <Upload size={14} /> {importing ? 'Yükleniyor...' : 'Excel ile Eşleştir'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" disabled={importing} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importExcel(f); e.target.value = ''; }} />
          </label>
          <button onClick={() => void triggerSync()} disabled={syncing} className="btn btn-primary text-sm">
            {syncing ? 'Çekiliyor...' : 'Sipariş Çek'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 size={14} /> {syncResult}
        </div>
      )}
      {importResult && (
        <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <CheckCircle2 size={14} /> {importResult}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-4">
          <div className="text-2xl font-bold text-slate-800">{rows.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Toplam SKU</div>
        </div>
        <div className="panel p-4">
          <div className="text-2xl font-bold text-green-600">{matched.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Eşleştirilmiş</div>
        </div>
        <div className="panel p-4">
          <div className="text-2xl font-bold text-red-500">{unmatched.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Bekliyor</div>
        </div>
      </div>

      {loading ? (
        <div className="panel p-8 text-center text-slate-400 text-sm">Yükleniyor...</div>
      ) : (
        <div className="panel overflow-hidden divide-y divide-line">
          {rows.map(row => (
            <SkuRow
              key={row.sku}
              row={row}
              stockCards={stockCards}
              platform={platform}
              expanded={expanded === row.sku}
              onToggle={() => setExpanded(expanded === row.sku ? null : row.sku)}
              onUpdate={load}
            />
          ))}
          {rows.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">Henüz sipariş verisi yok</div>
          )}
        </div>
      )}
    </main>
  );
}

function SkuRow({ row, stockCards, platform, expanded, onToggle, onUpdate }: {
  row: SkuRow; stockCards: StockCard[]; platform: string;
  expanded: boolean; onToggle: () => void; onUpdate: () => void;
}) {
  const isMatched = row.components.length > 0 || row.singleMapping;
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [qty, setQty] = useState('1');
  const [dropOpen, setDropOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<StockCard | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.length > 1
    ? stockCards.filter(c => c.sku.toLowerCase().includes(query.toLowerCase()) || c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : [];

  async function addComponent() {
    if (!selectedCard) return;
    setSaving(true);
    try {
      await api('/integrations/sku-components', {
        method: 'POST',
        json: { platform, externalSku: row.sku, stockCardId: selectedCard.id, quantity: Number(qty) || 1 },
      });
      setAdding(false); setSelectedCard(null); setQuery(''); setQty('1');
      await onUpdate();
    } finally { setSaving(false); }
  }

  async function removeComponent(stockCardId: number) {
    await api('/integrations/sku-components/delete', {
      method: 'POST',
      json: { platform, externalSku: row.sku, stockCardId },
    });
    await onUpdate();
  }

  return (
    <div>
      {/* Row header */}
      <div
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition select-none"
      >
        <div className="text-slate-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isMatched ? 'bg-green-500' : 'bg-red-400'}`} />
        <div className="flex-1 min-w-0">
          <span className="font-mono font-semibold text-sm">{row.sku}</span>
          {row.barcode && <span className="ml-2 text-xs text-slate-400">{row.barcode}</span>}
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap">{row.orderCount} sipariş</div>
        {row.components.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <Package size={12} /> {row.components.length} bileşen
          </div>
        )}
        {!isMatched && (
          <div className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle size={12} /> Eşleşmedi
          </div>
        )}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="bg-slate-50 border-t border-line px-6 py-4 space-y-3">
          {/* Components list */}
          {row.components.length > 0 && (
            <div className="space-y-1.5">
              {row.components.map(c => (
                <div key={c.stock_card_id} className="flex items-center gap-3 bg-white rounded border border-line px-3 py-2">
                  <div className="flex-1">
                    <span className="font-mono text-xs text-brand">{c.sku}</span>
                    <span className="ml-2 text-sm">{c.name}</span>
                  </div>
                  <div className="text-sm font-semibold">{c.quantity} {c.unit}</div>
                  <button onClick={() => void removeComponent(c.stock_card_id)} className="text-slate-300 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add component */}
          {adding ? (
            <div className="flex items-center gap-2 bg-white rounded border border-line px-3 py-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  className="field text-sm py-1.5 w-full"
                  placeholder="ERP stok kartı ara (sku veya ad)..."
                  value={selectedCard ? `${selectedCard.sku} — ${selectedCard.name}` : query}
                  onChange={e => { setQuery(e.target.value); setSelectedCard(null); setDropOpen(true); }}
                  onFocus={() => setDropOpen(true)}
                  onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                  autoFocus
                />
                {dropOpen && filtered.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-line rounded shadow-lg max-h-44 overflow-y-auto">
                    {filtered.map(c => (
                      <button key={c.id} type="button" onMouseDown={() => { setSelectedCard(c); setQuery(''); setDropOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand hover:text-white transition">
                        <span className="font-mono">{c.sku}</span> — {c.name}
                        <span className="ml-1 text-xs opacity-60">({c.stockQuantity} {c.unit})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                className="field text-sm py-1.5 w-20 text-center"
                type="number"
                min="0.001"
                step="0.001"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="Miktar"
              />
              <span className="text-xs text-slate-500">{selectedCard?.unit ?? 'adet'}</span>
              <button onClick={() => void addComponent()} disabled={!selectedCard || saving}
                className="btn btn-primary text-xs py-1.5 disabled:opacity-40">
                {saving ? '...' : 'Ekle'}
              </button>
              <button onClick={() => { setAdding(false); setSelectedCard(null); setQuery(''); }}
                className="text-slate-400 hover:text-slate-600 text-xs">İptal</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-sm text-brand hover:text-brand/80 font-medium transition">
              <Plus size={14} /> Bileşen Ekle
            </button>
          )}

          {row.components.length === 0 && !adding && (
            <p className="text-xs text-slate-400">Henüz bileşen eklenmedi. Sipariş stoktan düşmeyecek.</p>
          )}
        </div>
      )}
    </div>
  );
}
