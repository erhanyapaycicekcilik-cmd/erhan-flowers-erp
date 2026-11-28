'use client';

import { useEffect, useState } from 'react';
import { Layers, RefreshCw, Send } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Mode = 'OFF' | 'PREVIEW' | 'ON';
type Card = { id: number; name: string; stock: number; need: number };
type Row = {
  variantId: number;
  store: 'ERHAN' | 'FLORA' | string;
  productName: string;
  barcode: string;
  modelCode: string | null;
  currentStock: number;
  capacity: number;
  listed: number;
  change: number;
  limitingCard: Card;
  components: Card[];
};
type LastRun = { startedAt: string; finishedAt: string; trigger: string; ok: boolean; message: string; errors?: string[] } | null;
type Settings = { mode: Mode; buffer: number; lastRun?: LastRun };
type Preview = {
  settings: Settings;
  summary: { managed: number; changed: number; willClose: number; willOpen: number; byStore: { ERHAN: number; FLORA: number } };
  rows: Row[];
  total: number;
};

const MODE_LABEL: Record<Mode, string> = { OFF: 'Kapalı', PREVIEW: 'Önizleme (gönderme yok)', ON: 'Açık (pazaryerine gönder)' };
const STORE_LABEL: Record<string, string> = { ERHAN: 'Erhan Flowers', FLORA: 'Flora Yapay Çiçek' };
const num = (v: number) => Number(v || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });

export default function SharedStockPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [store, setStore] = useState<'ALL' | 'ERHAN' | 'FLORA'>('ALL');
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    setBusy(true);
    setMessage('');
    try {
      const [s, p] = await Promise.all([
        api<Settings>('/products/shared-stock/settings'),
        api<Preview>(`/products/shared-stock/preview?store=${store}&onlyChanged=${onlyChanged ? 1 : 0}&q=${encodeURIComponent(q.trim())}`),
      ]);
      setSettings(s);
      setPreview(p);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, onlyChanged]);

  async function save(next: Partial<Settings>) {
    if (next.mode === 'ON' && preview) {
      const s = preview.summary;
      if (!window.confirm(
        `Ortak stok AÇILACAK.\n\n${s.changed} ilanın adedi değişecek (${s.willClose} ilan 0'a düşüp satışa kapanacak, ${s.willOpen} ilan açılacak) ve pazaryerlerine gönderilecek.\n\nÖnizlemeyi kontrol ettiniz mi?`,
      )) return;
    }
    setBusy(true);
    setMessage('');
    try {
      const s = await api<Settings>('/products/shared-stock/settings', { method: 'POST', json: next });
      setSettings((prev) => ({ ...(prev ?? s), ...s }));
      setMessage(`Kaydedildi: ${MODE_LABEL[s.mode]}, güvenlik payı ${s.buffer}.`);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Kaydedilemedi');
      setBusy(false);
    }
  }

  async function runNow() {
    if (!window.confirm('Değişen ilan adetleri şimdi pazaryerlerine gönderilsin mi?')) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await api<{ ok: boolean; message: string }>('/products/shared-stock/run', { method: 'POST' });
      setMessage(r.message);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gönderilemedi');
      setBusy(false);
    }
  }

  const mode = settings?.mode ?? 'PREVIEW';
  const lastRun = settings?.lastRun ?? null;

  return (
    <AdminShell title="Ortak Stok">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Layers size={20} /> Ortak Stok (Erhan + Flora)</h2>
        <p className="text-sm text-slate-500">
          İki mağaza aynı depodan satar. Onaylı reçetesi olan ürünlerde ilan adedi, reçetedeki ana malzemelerin (ağaç/gövde/yaprak + saksı)
          stok kartlarından hesaplanır: kart stoğu ÷ reçete miktarı, en küçüğü. Sarf, işçilik ve paketleme hesaba katılmaz.
          Hesaplanan adet güvenlik payına eşit veya azsa ilanda 0 gösterilir (iki mağaza aynı son ürünü satmasın).
        </p>
      </div>

      <div className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-4">
        <div className="text-sm md:col-span-2">
          <span>Mod</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {(['OFF', 'PREVIEW', 'ON'] as Mode[]).map((m) => (
              <button key={m} type="button" className={`btn ${mode === m ? 'btn-primary' : 'btn-secondary'}`} disabled={busy || mode === m} onClick={() => save({ mode: m })}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Açık modda: her fiyat/stok gönderiminde adet reçeteden hesaplanır ve 10 dakikada bir değişen ilanlar gönderilir.
            Tek seferde çok sayıda açık ilan 0'a düşecekse hiçbir şey gönderilmez (toplu kapanma koruması).
          </p>
        </div>
        <label className="text-sm">Güvenlik payı (adet)
          <select className="field mt-1" value={settings?.buffer ?? 1} disabled={busy} onChange={(e) => save({ buffer: Number(e.target.value) })}>
            {[0, 1, 2, 3].map((b) => <option key={b} value={b}>{b === 0 ? '0 — son ürüne kadar sat' : `${b} — ${b} ve altı ilanda 0`}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={load} disabled={busy}><RefreshCw size={16} /> Yenile</button>
          {mode === 'ON' && <button type="button" className="btn btn-primary" onClick={runNow} disabled={busy}><Send size={16} /> Şimdi gönder</button>}
        </div>
      </div>

      {message && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}

      {lastRun && (
        <p className={`mt-3 rounded-md p-3 text-sm ${lastRun.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
          Son gönderim ({new Date(lastRun.finishedAt).toLocaleString('tr-TR')}, {lastRun.trigger === 'CRON' ? 'otomatik' : 'elle'}): {lastRun.message}
          {lastRun.errors?.length ? <span className="block text-xs">{lastRun.errors.join(' · ')}</span> : null}
        </p>
      )}

      {preview && (
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          {[
            ['Reçeteli ilan', preview.summary.managed],
            ['Adedi değişecek', preview.summary.changed],
            ['0\'a düşüp kapanacak', preview.summary.willClose],
            ['Satışa açılacak', preview.summary.willOpen],
            ['Erhan / Flora', `${preview.summary.byStore.ERHAN} / ${preview.summary.byStore.FLORA}`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border border-line bg-white p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-line bg-white p-3 text-sm">
        <label>Mağaza
          <select className="field mt-1" value={store} onChange={(e) => setStore(e.target.value as typeof store)}>
            <option value="ALL">Tümü</option>
            <option value="ERHAN">Erhan Flowers</option>
            <option value="FLORA">Flora Yapay Çiçek</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} /> Sadece adedi değişecekler
        </label>
        <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün, barkod, model kodu veya stok kartı ara" />
          <button className="btn btn-secondary" type="submit" disabled={busy}>Ara</button>
        </form>
      </div>

      {preview && (
        <div className="mt-3 overflow-x-auto rounded-md border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-2">Mağaza</th>
                <th className="p-2">Ürün</th>
                <th className="p-2 text-right">Şu anki adet</th>
                <th className="p-2 text-right">Reçeteden</th>
                <th className="p-2 text-right">İlanda olacak</th>
                <th className="p-2">Sınırlayan stok kartı</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r) => (
                <tr key={r.variantId} className="border-t border-line align-top">
                  <td className="p-2 whitespace-nowrap">
                    <span className={`rounded px-2 py-0.5 text-xs ${r.store === 'FLORA' ? 'bg-pink-50 text-pink-800' : 'bg-green-50 text-green-800'}`}>{STORE_LABEL[r.store] ?? r.store}</span>
                  </td>
                  <td className="p-2">
                    <p className="font-medium">{r.productName}</p>
                    <p className="text-xs text-slate-500">{r.modelCode ?? '—'} · {r.barcode}</p>
                  </td>
                  <td className="p-2 text-right">{r.currentStock}</td>
                  <td className="p-2 text-right">{r.capacity}</td>
                  <td className={`p-2 text-right font-semibold ${r.change < 0 ? 'text-red-700' : r.change > 0 ? 'text-green-700' : ''}`}>
                    {r.listed}{r.change !== 0 && <span className="ml-1 text-xs">({r.change > 0 ? '+' : ''}{r.change})</span>}
                  </td>
                  <td className="p-2">
                    <p>{r.limitingCard.name}</p>
                    <p className="text-xs text-slate-500">stok {num(r.limitingCard.stock)} · ürün başına {num(r.limitingCard.need)}</p>
                    {r.components.length > 1 && (
                      <details className="text-xs text-slate-500">
                        <summary className="cursor-pointer">Tüm malzemeler ({r.components.length})</summary>
                        <ul className="list-disc pl-4">{r.components.map((c) => <li key={c.id}>{c.name}: stok {num(c.stock)} / {num(c.need)}</li>)}</ul>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {!preview.rows.length && (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">{onlyChanged ? 'Adedi değişecek ilan yok.' : 'Onaylı reçetesi olan ilan bulunamadı.'}</td></tr>
              )}
            </tbody>
          </table>
          {preview.total > preview.rows.length && <p className="p-2 text-xs text-slate-500">İlk {preview.rows.length} / {preview.total} satır gösteriliyor — arama ile daraltın.</p>}
        </div>
      )}
    </AdminShell>
  );
}
