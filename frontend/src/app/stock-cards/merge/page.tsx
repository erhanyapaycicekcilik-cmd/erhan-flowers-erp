'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Search, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';

interface Card { id: number; name: string; sku: string | null; stockQuantity: number; salePrice: number; }

export default function MergeStockCardsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [searching, setSearching] = useState(false);
  const [source, setSource] = useState<Card | null>(null);
  const [target, setTarget] = useState<Card | null>(null);
  const [merging, setMerging] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<'source' | 'target' | null>(null);

  async function search(q: string) {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await api<{ items: Card[] }>(`/stock-cards?search=${encodeURIComponent(q)}&limit=20`);
      setResults(Array.isArray(data) ? data : (data as { items: Card[] }).items ?? []);
    } finally { setSearching(false); }
  }

  function pick(card: Card) {
    if (picking === 'source') setSource(card);
    else setTarget(card);
    setPicking(null);
    setResults([]);
    setQuery('');
  }

  async function merge() {
    if (!source || !target) return;
    if (!confirm(`"${source.name}" kartı "${target.name}" kartına birleştirilecek. Kaynak silinecek. Devam?`)) return;
    setMerging(true);
    setError(null);
    try {
      await api('/stock-cards/merge', { method: 'POST', json: { sourceId: source.id, targetId: target.id } });
      setDone(true);
      setSource(null);
      setTarget(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Birleştirme başarısız.');
    } finally { setMerging(false); }
  }

  return (
    <AdminShell title="Stok Kartı Birleştir">
      <div className="p-4 max-w-xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">Stok Kartı Birleştir</h1>
        <p className="text-sm text-slate-500">Kaynak kartın stok miktarı hedef karta eklenir, kaynak kart silinir. Tüm hareketler ve referanslar taşınır.</p>

        {done && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle2 size={16} /> Birleştirme tamamlandı.
            <button className="ml-auto text-xs underline" onClick={() => setDone(false)}>Yeni işlem</button>
          </div>
        )}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm">{error}</div>}

        {/* Kart seçimi */}
        <div className="flex items-center gap-3">
          <CardBox label="Kaynak (silinecek)" card={source} onPick={() => { setPicking('source'); setQuery(''); setResults([]); }} />
          <ArrowRight size={20} className="text-slate-400 shrink-0" />
          <CardBox label="Hedef (korunacak)" card={target} onPick={() => { setPicking('target'); setQuery(''); setResults([]); }} />
        </div>

        {/* Arama */}
        {picking && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {picking === 'source' ? 'Kaynak kart' : 'Hedef kart'} seç
            </div>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-brand/30">
              <Search size={15} className="text-slate-400" />
              <input
                autoFocus
                className="flex-1 outline-none text-sm"
                placeholder="Kart adı veya SKU ile ara..."
                value={query}
                onChange={e => { setQuery(e.target.value); void search(e.target.value); }}
              />
              {searching && <span className="text-xs text-slate-400">Aranıyor...</span>}
            </div>
            {results.length > 0 && (
              <div className="border border-slate-200 rounded-lg bg-white shadow max-h-60 overflow-y-auto divide-y divide-slate-100">
                {results.map(c => (
                  <button key={c.id} onClick={() => pick(c)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.sku ?? `#${c.id}`} · Stok: {Number(c.stockQuantity)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {source && target && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
            <div><b>{source.name}</b> ({Number(source.stockQuantity)} adet) → <b>{target.name}</b></div>
            <div>Hedef toplam stok: <b>{Number(source.stockQuantity) + Number(target.stockQuantity)} adet</b></div>
          </div>
        )}

        <button
          onClick={() => void merge()}
          disabled={!source || !target || merging}
          className="btn btn-primary w-full py-3 font-bold disabled:opacity-40"
        >
          {merging ? 'Birleştiriliyor...' : '✓ Birleştir'}
        </button>
      </div>
    </AdminShell>
  );
}

function CardBox({ label, card, onPick }: { label: string; card: { name: string; sku: string | null; stockQuantity: number } | null; onPick: () => void }) {
  return (
    <button onClick={onPick} className="flex-1 border-2 border-dashed border-slate-200 rounded-xl p-4 text-left hover:border-brand/40 hover:bg-slate-50 transition min-h-[80px]">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {card ? (
        <>
          <div className="font-semibold text-sm">{card.name}</div>
          <div className="text-xs text-slate-500">{card.sku ?? ''} · {Number(card.stockQuantity)} adet</div>
        </>
      ) : (
        <div className="text-slate-400 text-sm">Kart seç →</div>
      )}
    </button>
  );
}
