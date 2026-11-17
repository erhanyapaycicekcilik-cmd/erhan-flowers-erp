'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Summary = {
  sales: number;
  returns: number;
  discounts: number;
  commission: number;
  sellerRevenue: number;
  deductions: number;
  deductionsByType: Array<{ label: string; amount: number; count: number }>;
  net: number;
  payouts: Array<{ date: string | null; amount: number; paymentOrderId: string | null; description: string | null }>;
  payoutTotal: number;
  upcoming: Array<{ date: string; amount: number; count: number }>;
  orderCount: number;
};
type Store = { channel: string; label: string; ok: boolean; error?: string; warnings: string[]; summary?: Summary };
type Data = { from: string; to: string; fetchedAt: string; stores: Store[] };

const money = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateTr = (s: string | null) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

function preset(k: string): [string, string] {
  const t = new Date();
  if (k === 'lastMonth') return [iso(new Date(t.getFullYear(), t.getMonth() - 1, 1)), iso(new Date(t.getFullYear(), t.getMonth(), 0))];
  if (k === 'last30') return [iso(new Date(t.getTime() - 29 * 86400000)), iso(t)];
  if (k === 'last90') return [iso(new Date(t.getTime() - 89 * 86400000)), iso(t)];
  return [iso(new Date(t.getFullYear(), t.getMonth(), 1)), iso(t)];
}
const PRESETS = [['month', 'Bu ay'], ['lastMonth', 'Geçen ay'], ['last30', 'Son 30 gün'], ['last90', 'Son 90 gün']] as const;

const OTHER_PLATFORMS = [
  { name: 'Hepsiburada', url: 'https://merchant.hepsiburada.com', note: 'Hakediş servisi resmi API dokümanında doğrulanamadı — satıcı panelinden takip edin.' },
  { name: 'n11', url: 'https://so.n11.com', note: 'Hakediş servisi resmi API dokümanında doğrulanamadı — Satıcı Ofisi\'nden takip edin.' },
  { name: 'Amazon · Koçtaş · Pazarama · İdefix · Trendrum', url: null, note: 'API bilgileri girilip aktif olunca eklenebilir.' },
];

export default function HakedisPage() {
  const [[from, to], setRange] = useState<[string, string]>(preset('month'));
  const [active, setActive] = useState('month');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try { setData(await api<Data>(`/dashboard/settlements?from=${from}&to=${to}${refresh ? '&refresh=1' : ''}`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Yüklenemedi'); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const okStores = (data?.stores ?? []).filter((s) => s.ok && s.summary);
  const sum = (f: (s: Summary) => number) => okStores.reduce((t, s) => t + f(s.summary!), 0);

  return (
    <AdminShell title="Hakedişler">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
          {PRESETS.map(([k, l]) => (
            <button key={k} onClick={() => { setActive(k); setRange(preset(k)); }} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${active === k ? 'border-emerald-600 bg-emerald-600 text-white' : 'text-slate-600 hover:border-slate-400'}`}>{l}</button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            <input type="date" value={from} onChange={(e) => { setActive('custom'); setRange([e.target.value, to]); }} className="rounded-lg border px-2 py-1.5" />
            <span>–</span>
            <input type="date" value={to} onChange={(e) => { setActive('custom'); setRange([from, e.target.value]); }} className="rounded-lg border px-2 py-1.5" />
            <button onClick={() => void load(true)} className="rounded-lg border px-2 py-1.5" title="Platformdan yeniden çek"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {loading && <div className="text-sm text-slate-500">Trendyol cari hesap ekstresi alınıyor… (30-60 sn sürebilir)</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {data && okStores.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-emerald-700 p-4 text-white"><div className="text-xs opacity-80">Net hakediş (kesintiler düşülmüş)</div><div className="text-2xl font-bold">{money(sum((s) => s.net))}</div></div>
            <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Satış (brüt)</div><div className="text-xl font-bold">{money(sum((s) => s.sales))}</div></div>
            <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Komisyon + kesintiler</div><div className="text-xl font-bold text-red-600">{money(sum((s) => s.commission + s.deductions))}</div></div>
            <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">Yatırılan ödemeler</div><div className="text-xl font-bold text-emerald-700">{money(sum((s) => s.payoutTotal))}</div></div>
          </div>
        )}

        {(data?.stores ?? []).map((st) => (
          <div key={st.channel} className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{st.label}</h2>
              <a href="https://partner.trendyol.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600"><ExternalLink size={14} /> Satıcı paneli</a>
            </div>
            {!st.ok ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Veri alınamadı: {st.error}</div>
            ) : st.summary && (
              <>
                {st.warnings.length > 0 && <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{st.warnings.join(' · ')}</div>}
                <div className="overflow-hidden rounded-lg border text-sm">
                  {[
                    ['Satış (brüt)', st.summary.sales, `${st.summary.orderCount} sipariş`],
                    ['İadeler', -st.summary.returns, ''],
                    ['İndirim / kupon / diğer', st.summary.discounts, ''],
                    ['Trendyol komisyonu', -st.summary.commission, ''],
                    ['= Satıcı hakedişi', st.summary.sellerRevenue, 'Trendyol ekstresindeki satıcı geliri'],
                    ['Kesinti faturaları (kargo, reklam, hizmet bedeli…)', -st.summary.deductions, ''],
                  ].map(([label, value, hint], i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 ${String(label).startsWith('=') ? 'bg-slate-50 font-semibold' : ''} ${i ? 'border-t' : ''}`}>
                      <span>{label} {hint ? <span className="text-xs text-slate-400">· {hint}</span> : null}</span>
                      <span className={Number(value) < 0 ? 'text-red-600' : ''}>{money(Number(value))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t-2 bg-emerald-50 px-3 py-2.5 font-bold text-emerald-800">
                    <span>Net hakediş</span><span>{money(st.summary.net)}</span>
                  </div>
                </div>

                {st.summary.deductionsByType.length > 0 && (
                  <details className="rounded-lg border p-3 text-sm">
                    <summary className="cursor-pointer font-semibold">Kesinti faturaları ayrıntısı ({st.summary.deductionsByType.length})</summary>
                    <div className="mt-2 space-y-1">
                      {st.summary.deductionsByType.map((d) => (
                        <div key={d.label} className="flex justify-between"><span>{d.label} <span className="text-xs text-slate-400">× {d.count}</span></span><span>{money(d.amount)}</span></div>
                      ))}
                    </div>
                  </details>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="mb-2 font-semibold">Beklenen ödemeler (vade tarihine göre)</div>
                    {st.summary.upcoming.filter((u) => Math.abs(u.amount) > 0.009).length === 0 ? <div className="text-slate-400">Bu aralıkta bekleyen ödeme yok.</div> : st.summary.upcoming.filter((u) => Math.abs(u.amount) > 0.009).map((u) => (
                      <div key={u.date} className="flex justify-between border-t py-1 first:border-0"><span>{dateTr(u.date)} <span className="text-xs text-slate-400">· {u.count} kayıt</span></span><span className="font-semibold">{money(u.amount)}</span></div>
                    ))}
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="mb-2 font-semibold">Yatırılan ödemeler · {money(st.summary.payoutTotal)}</div>
                    {st.summary.payouts.length === 0 ? <div className="text-slate-400">Bu aralıkta ödeme yok.</div> : st.summary.payouts.map((p, i) => (
                      <div key={i} className="flex justify-between border-t py-1 first:border-0"><span>{dateTr(p.date)}{p.paymentOrderId ? <span className="text-xs text-slate-400"> · #{p.paymentOrderId}</span> : null}</span><span className="font-semibold text-emerald-700">{money(p.amount)}</span></div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        <div className="rounded-xl border bg-white p-4">
          <div className="mb-2 font-semibold">Diğer platformlar</div>
          <div className="space-y-2 text-sm">
            {OTHER_PLATFORMS.map((p) => (
              <div key={p.name} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-slate-500">— {p.note}</span>
                {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600">Panel ↗</a>}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Veriler Trendyol&apos;un cari hesap ekstresi (muhasebe &amp; finans) servisinden alınır; finans kaydı sipariş teslim edildikten sonra oluşur, bu yüzden son günlerin satışları henüz görünmeyebilir. Tarih = işlem tarihi. 10 dakika saklanır, ↻ ile yeniden çekilir.
          {data?.fetchedAt ? ` Son çekim: ${new Date(data.fetchedAt).toLocaleTimeString('tr-TR')}.` : ''}
        </p>
      </div>
    </AdminShell>
  );
}
