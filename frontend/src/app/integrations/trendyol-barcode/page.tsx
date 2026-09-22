'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminShell } from '@/components/AdminShell';
import { Save, CheckCircle2, Search } from 'lucide-react';

interface Product {
  id: number;
  productName: string;
  modelCode: string;
  barcode: string | null;
  trendyolBarcode: string | null;
}

export default function TrendyolBarcodePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<Product[]>('/products').then((data) => setProducts(data ?? []));
  }, []);

  const filtered = products.filter((p) => {
    const q = search.toLocaleLowerCase('tr-TR');
    return !q || p.productName.toLocaleLowerCase('tr-TR').includes(q) || (p.modelCode ?? '').toLowerCase().includes(q) || (p.trendyolBarcode ?? '').toLowerCase().includes(q);
  });

  async function saveOne(product: Product) {
    const val = (edits[product.id] ?? product.trendyolBarcode ?? '').trim();
    setSaving((s) => ({ ...s, [product.id]: true }));
    try {
      await api(`/products/${product.id}`, { method: 'PATCH', json: { trendyolBarcode: val || null } });
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, trendyolBarcode: val || null } : p));
      setSaved((s) => ({ ...s, [product.id]: true }));
      setEdits((e) => { const n = { ...e }; delete n[product.id]; return n; });
      setTimeout(() => setSaved((s) => ({ ...s, [product.id]: false })), 2000);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Kayıt hatası.');
    } finally {
      setSaving((s) => ({ ...s, [product.id]: false }));
    }
  }

  async function saveAll() {
    const toSave = filtered.filter((p) => edits[p.id] !== undefined);
    if (!toSave.length) { setMsg('Değişiklik yok.'); return; }
    setMsg('');
    for (const p of toSave) await saveOne(p);
    setMsg(`${toSave.length} ürün kaydedildi.`);
  }

  const missing = filtered.filter((p) => !(edits[p.id] ?? p.trendyolBarcode));

  return (
    <AdminShell title="Trendyol Barkod Eşleştir">
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <p className="text-sm text-slate-500">
          Her ürün için Trendyol&apos;daki <strong>Barkod</strong> veya <strong>Stok Kodu</strong> alanını girin.
          Fiyat/stok güncellemesi bu değerle gönderilir.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Ürün ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={saveAll}>
            <Save size={16} /> Tümünü Kaydet
          </button>
        </div>

        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        {missing.length > 0 && (
          <p className="text-sm text-amber-600">⚠ {missing.length} ürünün Trendyol barkodu eksik.</p>
        )}

        <div className="divide-y rounded-xl border bg-white">
          {filtered.length === 0 && <p className="p-4 text-sm text-slate-400">Ürün bulunamadı.</p>}
          {filtered.map((p) => {
            const current = edits[p.id] ?? p.trendyolBarcode ?? '';
            const isDirty = edits[p.id] !== undefined && edits[p.id] !== (p.trendyolBarcode ?? '');
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{p.productName}</p>
                  <p className="text-xs text-slate-400">{p.modelCode}</p>
                </div>
                <input
                  className={`input w-44 text-sm ${isDirty ? 'border-amber-400 bg-amber-50' : ''}`}
                  placeholder="Trendyol barkod…"
                  value={current}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && saveOne(p)}
                />
                <button
                  className="btn btn-secondary min-w-[60px] text-sm"
                  disabled={saving[p.id] || !isDirty}
                  onClick={() => saveOne(p)}
                >
                  {saved[p.id] ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Save size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
