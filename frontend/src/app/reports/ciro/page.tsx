'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Day = { date: string; total: number; orders: number; byChannel: Record<string, number> };
type Ledger = {
  from: string;
  to: string;
  total: number;
  orders: number;
  dailyAverage: number;
  bestDay: Day | null;
  channels: Array<{ channel: string; revenue: number; orders: number }>;
  days: Day[];
};

const CHANNEL: Record<string, { label: string; color: string }> = {
  TRENDYOL: { label: 'Trendyol', color: '#f27a1a' },
  TRENDYOL_FLORA: { label: 'Trendyol · Flora', color: '#c026d3' },
  HEPSIBURADA: { label: 'Hepsiburada', color: '#ff6000' },
  N11: { label: 'n11', color: '#5b21b6' },
  N11_FLORA: { label: 'n11 · Flora', color: '#7c3aed' },
  AMAZON: { label: 'Amazon', color: '#111827' },
  KOCTAS: { label: 'Koçtaş', color: '#e11d48' },
  PAZARAMA: { label: 'Pazarama', color: '#0ea5e9' },
  IDEFIX: { label: 'İdefix', color: '#facc15' },
  TRENDRUM: { label: 'Trendrum', color: '#14b8a6' },
  WEBSITE: { label: 'Web Sitesi', color: '#047857' },
  STORE: { label: 'Dükkan', color: '#475569' },
  PHONE: { label: 'Telefon', color: '#0369a1' },
  WHATSAPP: { label: 'WhatsApp', color: '#16a34a' },
  INSTAGRAM: { label: 'Instagram', color: '#db2777' },
  OTHER: { label: 'Diğer', color: '#94a3b8' },
};
const ch = (k: string) => CHANNEL[k] ?? { label: k, color: '#64748b' };
const money = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const money0 = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayLabel = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', weekday: 'short' });

function preset(key: string): [string, string] {
  const t = new Date();
  const d = (y: number, m: number, day: number) => iso(new Date(y, m, day));
  switch (key) {
    case 'today': return [iso(t), iso(t)];
    case 'yesterday': { const y = new Date(t.getTime() - 86400000); return [iso(y), iso(y)]; }
    case 'week': { const w = new Date(t); w.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return [iso(w), iso(t)]; }
    case 'last30': return [iso(new Date(t.getTime() - 29 * 86400000)), iso(t)];
    case 'lastMonth': return [d(t.getFullYear(), t.getMonth() - 1, 1), d(t.getFullYear(), t.getMonth(), 0)];
    default: return [d(t.getFullYear(), t.getMonth(), 1), iso(t)];
  }
}
const PRESETS = [
  ['today', 'Bugün'], ['yesterday', 'Dün'], ['week', 'Bu hafta'], ['month', 'Bu ay'], ['lastMonth', 'Geçen ay'], ['last30', 'Son 30 gün'],
] as const;

export default function CiroPage() {
  const [[from, to], setRange] = useState<[string, string]>(preset('month'));
  const [active, setActive] = useState<string>('month');
  const [data, setData] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await api<Ledger>(`/dashboard/revenue?from=${from}&to=${to}`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Yüklenemedi'); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const channelKeys = useMemo(() => (data?.channels ?? []).map((c) => c.channel), [data]);
  const maxDay = Math.max(1, ...(data?.days ?? []).map((d) => d.total));
  const days = [...(data?.days ?? [])].reverse(); // en yeni gün üstte

  function exportCsv() {
    if (!data) return;
    const head = ['Tarih', ...channelKeys.map((k) => ch(k).label), 'Toplam', 'Sipariş'];
    const lines = data.days.map((d) => [d.date, ...channelKeys.map((k) => (d.byChannel[k] ?? 0).toFixed(2).replace('.', ',')), d.total.toFixed(2).replace('.', ','), String(d.orders)]);
    lines.push(['TOPLAM', ...channelKeys.map((k) => (data.channels.find((c) => c.channel === k)?.revenue ?? 0).toFixed(2).replace('.', ',')), data.total.toFixed(2).replace('.', ','), String(data.orders)]);
    const csv = '﻿' + [head, ...lines].map((r) => r.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `ciro-${data.from}_${data.to}.csv`;
    a.click();
  }

  return (
    <AdminShell title="Günlük Ciro">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Tarih aralığı */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
          {PRESETS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => { setActive(k); setRange(preset(k)); }}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${active === k ? 'border-emerald-600 bg-emerald-600 text-white' : 'text-slate-600 hover:border-slate-400'}`}
            >
              {l}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            <input type="date" value={from} onChange={(e) => { setActive('custom'); setRange([e.target.value, to]); }} className="rounded-lg border px-2 py-1.5" />
            <span>–</span>
            <input type="date" value={to} onChange={(e) => { setActive('custom'); setRange([from, e.target.value]); }} className="rounded-lg border px-2 py-1.5" />
            <button onClick={() => void load()} className="rounded-lg border px-2 py-1.5" title="Yenile"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
            <button onClick={exportCsv} disabled={!data} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-50"><Download size={15} /> Excel (CSV)</button>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {data && (
          <>
            {/* Özet */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-emerald-700 p-4 text-white">
                <div className="text-xs opacity-80">Toplam ciro</div>
                <div className="text-2xl font-bold">{money(data.total)}</div>
              </div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Sipariş / satış</div><div className="text-xl font-bold">{data.orders}</div></div>
              <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Günlük ortalama</div><div className="text-xl font-bold">{money(data.dailyAverage)}</div></div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-slate-500">En iyi gün</div>
                <div className="text-xl font-bold">{data.bestDay && data.bestDay.total > 0 ? money0(data.bestDay.total) : '—'}</div>
                {data.bestDay && data.bestDay.total > 0 && <div className="text-xs text-slate-500">{dayLabel(data.bestDay.date)}</div>}
              </div>
            </div>

            {/* Kanal dağılımı */}
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-3 font-semibold">Kanallara göre</div>
              {data.channels.length === 0 ? (
                <div className="text-sm text-slate-400">Bu aralıkta satış yok.</div>
              ) : (
                <div className="space-y-2">
                  {data.channels.map((c) => {
                    const pct = data.total ? (c.revenue / data.total) * 100 : 0;
                    return (
                      <div key={c.channel} className="flex items-center gap-3 text-sm">
                        <div className="w-36 shrink-0 font-medium">{ch(c.channel).label}</div>
                        <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                          <div className="h-full rounded" style={{ width: `${pct}%`, background: ch(c.channel).color }} />
                        </div>
                        <div className="w-32 shrink-0 text-right font-semibold">{money0(c.revenue)}</div>
                        <div className="w-28 shrink-0 whitespace-nowrap text-right text-xs text-slate-500">{c.orders} sip. · %{pct.toFixed(0)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Günlük tablo */}
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Gün</th>
                    <th className="px-3 py-2 text-left">Ciro</th>
                    {channelKeys.map((k) => <th key={k} className="px-3 py-2 text-right">{ch(k).label}</th>)}
                    <th className="px-3 py-2 text-right">Sipariş</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date} className="border-t">
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{dayLabel(d.date)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-28 overflow-hidden rounded bg-slate-100"><div className="h-full rounded bg-emerald-600" style={{ width: `${(d.total / maxDay) * 100}%` }} /></div>
                          <span className="font-bold">{d.total ? money0(d.total) : <span className="font-normal text-slate-300">0 ₺</span>}</span>
                        </div>
                      </td>
                      {channelKeys.map((k) => (
                        <td key={k} className="px-3 py-2 text-right text-slate-600">{d.byChannel[k] ? money0(d.byChannel[k]) : '—'}</td>
                      ))}
                      <td className="px-3 py-2 text-right text-slate-500">{d.orders || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-slate-50 font-bold">
                  <tr>
                    <td className="px-3 py-2">TOPLAM</td>
                    <td className="px-3 py-2">{money(data.total)}</td>
                    {channelKeys.map((k) => <td key={k} className="px-3 py-2 text-right">{money0(data.channels.find((c) => c.channel === k)?.revenue ?? 0)}</td>)}
                    <td className="px-3 py-2 text-right">{data.orders}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-xs text-slate-500">
              Ciroya girenler: pazaryeri siparişleri (iptal, iade ve teslim edilemeyenler hariç), dükkan / telefon / WhatsApp / Instagram satışları, ödenmiş ya da onaylanmış web sitesi siparişleri. Tutarlar müşterinin ödediği sipariş tutarıdır (KDV dahil, komisyon ve kargo düşülmemiş). Günler Türkiye saatine göredir.
            </p>
          </>
        )}
      </div>
    </AdminShell>
  );
}
