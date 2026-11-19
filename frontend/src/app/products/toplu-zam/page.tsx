'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Percent, RotateCcw, Send } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Mode = 'PERCENT' | 'AMOUNT';
type Row = { variantId: number; barcode: string; modelCode: string | null; name: string; stock: number; oldPrice: number; newPrice: number };
type Preview = { count: number; totalOld: number; totalNew: number; rows: Row[] };
type Job = { running: boolean; kind: 'APPLY' | 'UNDO' | null; total: number; done: number; ok: number; failed: number; errors: string[]; startedAt: string | null; finishedAt: string | null };
type LastUndo = { at: string; params: { mode: Mode; value: number; search?: string }; count: number } | null;

const money = (v: number) => `${Number(v || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`;

export default function BulkPricePage() {
  const [mode, setMode] = useState<Mode>('PERCENT');
  const [value, setValue] = useState('10');
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [roundTo9, setRoundTo9] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [lastUndo, setLastUndo] = useState<LastUndo>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const params = () => ({
    mode,
    value: Number(String(value).replace(',', '.')),
    search: search.trim() || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    roundTo9,
  });

  async function loadStatus() {
    try {
      const s = await api<{ job: Job; lastUndo: LastUndo }>('/products/bulk-price/status');
      setJob(s.job);
      setLastUndo(s.lastUndo);
      if (!s.job.running && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      return s.job;
    } catch {
      return null;
    }
  }

  function poll() {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(loadStatus, 2000);
  }

  useEffect(() => {
    loadStatus().then((j) => { if (j?.running) poll(); });
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  function changed() {
    setPreview(null);
    setExcluded(new Set());
  }

  async function loadPreview() {
    setBusy(true);
    setMessage('');
    try {
      const p = await api<Preview>('/products/bulk-price/preview', { method: 'POST', json: params() });
      setPreview(p);
      setExcluded(new Set());
      if (!p.count) setMessage('Bu filtreye uyan ürün yok.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Önizleme alınamadı');
    } finally {
      setBusy(false);
    }
  }

  const selected = useMemo(() => (preview ? preview.rows.filter((r) => !excluded.has(r.variantId)) : []), [preview, excluded]);

  async function apply() {
    if (!preview || !selected.length) return;
    const p = params();
    const label = p.mode === 'PERCENT' ? `%${p.value}` : `${p.value} TL`;
    if (!window.confirm(`${selected.length} ürüne ${label} ${p.value > 0 ? 'zam' : 'indirim'} uygulanacak ve Trendyol, N11, Hepsiburada'ya gönderilecek. Onaylıyor musunuz?`)) return;
    setBusy(true);
    setMessage('');
    try {
      const variantIds = excluded.size ? selected.map((r) => r.variantId) : undefined;
      const r = await api<{ count: number }>('/products/bulk-price/apply', { method: 'POST', json: { ...p, variantIds } });
      setMessage(`${r.count} ürün için işlem başladı. Bu sayfada ilerlemeyi görebilirsiniz.`);
      setPreview(null);
      await loadStatus();
      poll();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!lastUndo) return;
    if (!window.confirm(`Son toplu işlemdeki ${lastUndo.count} ürün eski fiyatına döndürülecek ve pazaryerlerine gönderilecek. Onaylıyor musunuz?`)) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await api<{ count: number }>('/products/bulk-price/undo', { method: 'POST' });
      setMessage(`${r.count} ürün eski fiyatına döndürülüyor.`);
      await loadStatus();
      poll();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Geri alınamadı');
    } finally {
      setBusy(false);
    }
  }

  const running = Boolean(job?.running);
  const numValue = Number(String(value).replace(',', '.'));

  return (
    <AdminShell title="Toplu Zam">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Percent size={20} /> Toplu Zam / İndirim</h2>
        <p className="text-sm text-slate-500">
          Trendyol'daki (Erhan Flowers) aktif ürünlerin fiyatına yüzde veya TL ekler; ERP fiyatlarını günceller ve bağlı pazaryerlerine
          (Trendyol, N11, Hepsiburada) gönderir. Site fiyatı Trendyol fiyatından hesaplandığı için kendiliğinden değişir.
          İndirim için eksi yazın (ör. -10). WEB- ürünleri ve Flora mağazası etkilenmez.
        </p>
      </div>

      <div className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-4">
        <div className="text-sm">
          <span>Zam türü</span>
          <div className="mt-1 flex gap-2">
            <button type="button" className={`btn ${mode === 'PERCENT' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('PERCENT'); changed(); }}>Yüzde (%)</button>
            <button type="button" className={`btn ${mode === 'AMOUNT' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('AMOUNT'); changed(); }}>TL</button>
          </div>
        </div>
        <label className="text-sm">{mode === 'PERCENT' ? 'Yüzde (%)' : 'Tutar (TL)'}
          <input className="field mt-1" inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); changed(); }} placeholder={mode === 'PERCENT' ? 'ör. 10 veya -5' : 'ör. 50 veya -20'} />
        </label>
        <label className="text-sm md:col-span-2">Ürün filtresi (ad / model kodu / barkod, boş = tümü)
          <input className="field mt-1" value={search} onChange={(e) => { setSearch(e.target.value); changed(); }} placeholder="ör. zeytin, areka, ERH-" />
        </label>
        <label className="text-sm">En düşük mevcut fiyat (TL)
          <input className="field mt-1" type="number" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); changed(); }} placeholder="boş = sınır yok" />
        </label>
        <label className="text-sm">En yüksek mevcut fiyat (TL)
          <input className="field mt-1" type="number" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); changed(); }} placeholder="boş = sınır yok" />
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={roundTo9} onChange={(e) => { setRoundTo9(e.target.checked); changed(); }} />
          Fiyatları …9 ile bitir (ör. 1.243 → 1.239, 1.246 → 1.249)
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-4">
          <button type="button" className="btn btn-secondary" onClick={loadPreview} disabled={busy || running || !numValue}>
            <Eye size={16} /> Önizle
          </button>
          <button type="button" className="btn btn-primary" onClick={apply} disabled={busy || running || !preview || !selected.length}>
            <Send size={16} /> {selected.length ? `${selected.length} ürüne uygula ve gönder` : 'Uygula ve gönder'}
          </button>
          {lastUndo && !running && (
            <button type="button" className="btn btn-secondary" onClick={undo} disabled={busy}>
              <RotateCcw size={16} /> Son işlemi geri al ({lastUndo.params.mode === 'PERCENT' ? `%${lastUndo.params.value}` : `${lastUndo.params.value} TL`}, {lastUndo.count} ürün, {new Date(lastUndo.at).toLocaleString('tr-TR')})
            </button>
          )}
        </div>
      </div>

      {message && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}

      {job && (job.running || job.finishedAt) && (
        <div className="mt-3 rounded-md border border-line bg-white p-4 text-sm">
          <p className="font-semibold">
            {job.kind === 'UNDO' ? 'Geri alma' : 'Toplu fiyat'} {job.running ? 'devam ediyor' : 'tamamlandı'}: {job.done} / {job.total}
            {' · '}<span className="text-green-700">{job.ok} başarılı</span>
            {job.failed > 0 && <>{' · '}<span className="text-red-700">{job.failed} hatalı</span></>}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-100">
            <div className="h-2 bg-green-600" style={{ width: `${job.total ? Math.round((job.done / job.total) * 100) : 0}%` }} />
          </div>
          {!job.running && <p className="mt-2 text-slate-500">Trendyol fiyatları birkaç dakika içinde panelde görünür.</p>}
          {job.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-700">Uyarılar / hatalar ({job.errors.length})</summary>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">{job.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </details>
          )}
        </div>
      )}

      {preview && preview.count > 0 && (
        <div className="mt-4 rounded-md border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3 text-sm">
            <span><b>{selected.length}</b> / {preview.count} ürün seçili</span>
            <span>Toplam: {money(selected.reduce((s, r) => s + r.oldPrice, 0))} → <b>{money(selected.reduce((s, r) => s + r.newPrice, 0))}</b></span>
            <span className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setExcluded(new Set())}>Tümünü seç</button>
              <button type="button" className="btn btn-secondary" onClick={() => setExcluded(new Set(preview.rows.map((r) => r.variantId)))}>Hiçbirini seçme</button>
            </span>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left">
                <tr>
                  <th className="p-2" />
                  <th className="p-2">Ürün</th>
                  <th className="p-2">Model kodu</th>
                  <th className="p-2 text-right">Stok</th>
                  <th className="p-2 text-right">Şu an</th>
                  <th className="p-2 text-right">Yeni</th>
                  <th className="p-2 text-right">Fark</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => {
                  const on = !excluded.has(r.variantId);
                  return (
                    <tr key={r.variantId} className={`border-t border-line ${on ? '' : 'opacity-40'}`}>
                      <td className="p-2">
                        <input type="checkbox" checked={on} onChange={() => setExcluded((cur) => {
                          const next = new Set(cur);
                          if (next.has(r.variantId)) next.delete(r.variantId); else next.add(r.variantId);
                          return next;
                        })} />
                      </td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-slate-500">{r.modelCode ?? r.barcode}</td>
                      <td className="p-2 text-right">{r.stock}</td>
                      <td className="p-2 text-right">{money(r.oldPrice)}</td>
                      <td className="p-2 text-right font-semibold">{money(r.newPrice)}</td>
                      <td className={`p-2 text-right ${r.newPrice >= r.oldPrice ? 'text-green-700' : 'text-red-700'}`}>{r.newPrice - r.oldPrice > 0 ? '+' : ''}{money(r.newPrice - r.oldPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
