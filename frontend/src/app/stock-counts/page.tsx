'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Plus, Save, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type StockCountStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED';

type StockCountSummary = {
  id: number;
  title: string;
  note: string | null;
  status: StockCountStatus;
  createdAt: string;
  approvedAt: string | null;
  itemCount: number;
  countedItemCount: number;
  differenceCount: number;
};

type StockCountDetail = {
  id: number;
  title: string;
  note: string | null;
  status: StockCountStatus;
  createdAt: string;
  approvedAt: string | null;
  items: StockCountItem[];
};

type StockCountItem = {
  id: number;
  stockCardId: number;
  stockName: string;
  sku: string | null;
  category: string | null;
  unit: string;
  snapshotQuantity: number;
  countedQuantity: number | null;
  difference: number;
  note: string | null;
};

const emptyForm = {
  title: '',
  note: '',
};

export default function StockCountsPage() {
  const [counts, setCounts] = useState<StockCountSummary[]>([]);
  const [selected, setSelected] = useState<StockCountDetail | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const data = await api<StockCountSummary[]>('/stock-counts');
    setCounts(data);
    if (!selected && data[0]) {
      const firstDraft = data.find((item) => item.status === 'DRAFT') ?? data[0];
      await openCount(firstDraft.id);
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    const needle = normalize(search);
    return (selected?.items ?? []).filter((item) => {
      const text = normalize(`${item.stockName} ${item.sku ?? ''} ${item.category ?? ''}`);
      return !needle || text.includes(needle);
    });
  }, [selected, search]);

  async function createCount(event: FormEvent) {
    event.preventDefault();
    const created = await api<StockCountDetail>('/stock-counts', {
      method: 'POST',
      json: {
        title: form.title || undefined,
        note: form.note || undefined,
      },
    });
    setSelected(created);
    setForm(emptyForm);
    setMessage('Yeni stok sayımı açıldı.');
    await loadListOnly();
  }

  async function loadListOnly() {
    setCounts(await api<StockCountSummary[]>('/stock-counts'));
  }

  async function openCount(id: number) {
    setSelected(await api<StockCountDetail>(`/stock-counts/${id}`));
    setSearch('');
  }

  function updateItem(id: number, patch: Partial<StockCountItem>) {
    setSelected((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => {
          if (item.id !== id) return item;
          const next = { ...item, ...patch };
          next.difference = next.countedQuantity === null ? 0 : Number(next.countedQuantity) - Number(next.snapshotQuantity);
          return next;
        }),
      };
    });
  }

  async function saveCount() {
    if (!selected) return;
    const saved = await api<StockCountDetail>(`/stock-counts/${selected.id}/items`, {
      method: 'POST',
      json: {
        items: selected.items.map((item) => ({
          id: item.id,
          countedQuantity: item.countedQuantity,
          note: item.note,
        })),
      },
    });
    setSelected(saved);
    setMessage('Sayım kaydedildi. Onaylanana kadar ana stok miktarı değişmez.');
    await loadListOnly();
  }

  async function approveCount() {
    if (!selected) return;
    await saveCount();
    const approved = await api<StockCountDetail>(`/stock-counts/${selected.id}/approve`, { method: 'POST' });
    setSelected(approved);
    setMessage('Sayım onaylandı. Sayılan miktarlar Stok Kartları ekranına işlendi.');
    await loadListOnly();
  }

  async function deleteCount(id: number) {
    await api(`/stock-counts/${id}`, { method: 'DELETE' });
    setMessage('Taslak sayım silindi.');
    setSelected((current) => (current?.id === id ? null : current));
    await loadListOnly();
  }

  const totalDifference = (selected?.items ?? []).reduce((sum, item) => sum + Number(item.difference || 0), 0);

  return (
    <AdminShell title="Stok Sayım">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <form onSubmit={createCount} className="panel p-5">
            <div className="mb-5 flex items-center gap-2">
              <ClipboardList size={18} />
              <h2 className="font-bold">Yeni Sayım Başlat</h2>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="label">Sayım Adı</span>
                <input className="field" placeholder="Depo genel sayımı" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>
              <label className="block space-y-1.5">
                <span className="label">Not</span>
                <textarea className="field min-h-24" placeholder="Raf, bölüm veya açıklama" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
              </label>
            </div>

            <button className="btn btn-primary mt-5 w-full">
              <Plus size={17} />
              Sayım Aç
            </button>
          </form>

          <section className="panel overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-bold">Sayım Geçmişi</h2>
            </div>
            <div className="divide-y divide-line">
              {counts.length === 0 && <div className="px-5 py-6 text-sm text-slate-500">Henüz stok sayımı yok.</div>}
              {counts.map((count) => (
                <div key={count.id} className="px-5 py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => openCount(count.id)}>
                      <div className="font-semibold">{count.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {count.countedItemCount}/{count.itemCount} kalem sayıldı · {count.differenceCount} fark
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill status={count.status} />
                      {count.status === 'DRAFT' && (
                        <button className="btn btn-secondary min-h-9 px-3 text-red-700" onClick={() => deleteCount(count.id)} title="Taslak sayımı sil">
                          <Trash2 size={15} />
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel overflow-hidden">
          {!selected ? (
            <div className="px-5 py-10 text-sm text-slate-500">Sayım seç veya yeni sayım başlat.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <h2 className="font-bold">{selected.title}</h2>
                  <p className="text-sm text-slate-500">
                    Sistem stoku ile sayılan stok karşılaştırılır. Toplam fark: <strong>{totalDifference.toLocaleString('tr-TR')}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-secondary" onClick={saveCount} disabled={selected.status !== 'DRAFT'}>
                    <Save size={17} />
                    Kaydet
                  </button>
                  <button className="btn btn-primary" onClick={approveCount} disabled={selected.status !== 'DRAFT'}>
                    <CheckCircle2 size={17} />
                    Sayımı Onayla
                  </button>
                </div>
              </div>

              {message && <div className="mx-5 mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

              <div className="border-b border-line px-5 py-4">
                <input className="field max-w-md" placeholder="Stok adı, kodu veya kategori ara" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Stok</th>
                      <th className="px-5 py-3">Kod</th>
                      <th className="px-5 py-3">Kategori</th>
                      <th className="px-5 py-3">Sistem Stoku</th>
                      <th className="px-5 py-3">Sayılan Stok</th>
                      <th className="px-5 py-3">Fark</th>
                      <th className="px-5 py-3">Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="border-t border-line align-top">
                        <td className="px-5 py-3 font-semibold">{item.stockName}</td>
                        <td className="px-5 py-3">{item.sku || '-'}</td>
                        <td className="px-5 py-3">{item.category || '-'}</td>
                        <td className="px-5 py-3">{item.snapshotQuantity.toLocaleString('tr-TR')} {item.unit}</td>
                        <td className="px-5 py-3">
                          <input
                            className="field h-10 w-32"
                            type="number"
                            step="0.001"
                            disabled={selected.status !== 'DRAFT'}
                            value={item.countedQuantity ?? ''}
                            onChange={(event) => updateItem(item.id, { countedQuantity: event.target.value === '' ? null : Number(event.target.value) })}
                          />
                        </td>
                        <td className={`px-5 py-3 font-bold ${item.difference < 0 ? 'text-red-700' : item.difference > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {item.difference.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-5 py-3">
                          <input className="field h-10" disabled={selected.status !== 'DRAFT'} value={item.note ?? ''} onChange={(event) => updateItem(item.id, { note: event.target.value })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function StatusPill({ status }: { status: StockCountStatus }) {
  const label = status === 'APPROVED' ? 'Onaylandı' : status === 'CANCELLED' ? 'İptal' : 'Taslak';
  const className = status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700';
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function normalize(value: string) {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
