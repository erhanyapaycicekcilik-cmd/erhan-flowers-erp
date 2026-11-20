'use client';

import { OrdersTabs } from '@/components/OrdersTabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, RefreshCw, ImageOff, CheckSquare, Square, ListChecks } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';

/**
 * Sabah Çıktısı — tüm platformların (Trendyol Erhan/Flora, Hepsiburada, N11, web sitesi,
 * dükkan/WhatsApp/telefon) kargoya çıkacak siparişleri tek listede; her sipariş tek A5 sayfa
 * (adres + görselli ürünler) ve A5 toplama listesi.
 */

type OrderItem = {
  id?: number;
  productName?: string | null;
  quantity?: number | string | null;
  imagePath?: string | null;
  modelCode?: string | null;
  barcode?: string | null;
  variationText?: string | null;
};

type OrderRow = {
  id: number;
  saleNumber: string;
  platformOrderNumber?: string | null;
  platform: string;
  status: string;
  customerName: string;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  fullAddress?: string | null;
  orderDate?: string | null;
  createdAt?: string | null;
  deliveryDueAt?: string | null;
  cargoProvider?: string | null;
  cargoTrackingNumber?: string | null;
  companyCode?: string | null;
  internalNote?: string | null;
  customerNote?: string | null;
  items: OrderItem[];
};

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  TRENDYOL: { label: 'Trendyol', color: '#f27a1a' },
  FLORA_TRENDYOL: { label: 'Trendyol · Flora', color: '#c026d3' },
  HEPSIBURADA: { label: 'Hepsiburada', color: '#ff6000' },
  N11: { label: 'N11', color: '#5b21b6' },
  AMAZON: { label: 'Amazon', color: '#111827' },
  WEBSITE: { label: 'Web Sitesi', color: '#047857' },
  WHATSAPP: { label: 'WhatsApp', color: '#16a34a' },
  PHONE: { label: 'Telefon', color: '#0369a1' },
  STORE: { label: 'Dükkan', color: '#475569' },
  INSTAGRAM: { label: 'Instagram', color: '#db2777' },
};

function platformKey(o: OrderRow) {
  if (o.platform === 'TRENDYOL' && o.companyCode === 'FLORA') return 'FLORA_TRENDYOL';
  if (o.platform === 'TRENDYOL_FLORA') return 'FLORA_TRENDYOL';
  return o.platform;
}
const meta = (o: OrderRow) => PLATFORM_META[platformKey(o)] ?? { label: o.platform, color: '#334155' };
const orderKey = (o: OrderRow) => `${o.platform}-${o.id}`;
const imgSrc = (p?: string | null) => (!p ? '' : p.startsWith('http') ? p : apiFileUrl(p));
const qty = (q: unknown) => Number(q ?? 1) || 1;
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

const PRINTED_KEY = 'sabah-ciktisi-printed';
function loadPrinted(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PRINTED_KEY) ?? '{}'); } catch { return {}; }
}
function savePrinted(v: Record<string, number>) {
  try {
    const cutoff = Date.now() - 14 * 86400000; // 14 günden eskiyi unut
    const clean = Object.fromEntries(Object.entries(v).filter(([, t]) => t > cutoff));
    localStorage.setItem(PRINTED_KEY, JSON.stringify(clean));
  } catch { /* depolama yoksa sorun değil */ }
}

export default function SabahCiktisiPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printed, setPrinted] = useState<Record<string, number>>({});
  const [onlyUnprinted, setOnlyUnprinted] = useState(true);
  const [printMode, setPrintMode] = useState<'orders' | 'picking' | null>(null);
  /** Yazdırma anındaki sipariş listesi (baskı sürerken liste değişse de sayfa boşalmasın) */
  const [printOrders, setPrintOrders] = useState<OrderRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [erp, web, retail] = await Promise.all([
        api<OrderRow[]>('/integrations/orders?limit=300&status=CONFIRMED,PREPARING,IN_PRODUCTION,READY').catch(() => [] as OrderRow[]),
        api<OrderRow[]>('/integrations/web-orders?limit=200&status=CONFIRMED,PREPARING,READY').catch(() => [] as OrderRow[]),
        api<OrderRow[]>('/integrations/retail-orders?limit=200&status=PAYMENT_PENDING,CONFIRMED,PREPARING,IN_PRODUCTION,READY').catch(() => [] as OrderRow[]),
      ]);
      const all = [...(erp ?? []), ...(web ?? []), ...(retail ?? [])]
        .filter((o) => Array.isArray(o.items))
        .sort((a, b) => {
          // Önce son kargo saati yaklaşanlar, sonra eski siparişler
          const da = a.deliveryDueAt ? new Date(a.deliveryDueAt).getTime() : Infinity;
          const db = b.deliveryDueAt ? new Date(b.deliveryDueAt).getTime() : Infinity;
          if (da !== db) return da - db;
          return new Date(a.orderDate ?? a.createdAt ?? 0).getTime() - new Date(b.orderDate ?? b.createdAt ?? 0).getTime();
        });
      setOrders(all);
      const pl = new Set(all.map(platformKey));
      setPlatforms(pl);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setPrinted(loadPrinted()); void load(); }, [load]);

  const allPlatformKeys = useMemo(() => Array.from(new Set(orders.map(platformKey))), [orders]);
  const visible = useMemo(
    () => orders.filter((o) => platforms.has(platformKey(o)) && (!onlyUnprinted || !printed[orderKey(o)])),
    [orders, platforms, onlyUnprinted, printed],
  );

  // Görünür liste değişince varsayılan: hepsi seçili
  useEffect(() => { setSelected(new Set(visible.map(orderKey))); }, [visible]);

  const chosen = visible.filter((o) => selected.has(orderKey(o)));
  const missingImageCount = chosen.reduce((n, o) => n + o.items.filter((i) => !i.imagePath).length, 0);

  const buildPicking = (list: OrderRow[]) => {
    const map = new Map<string, { name: string; image: string; code: string; total: number; orders: string[] }>();
    for (const o of list) {
      for (const it of o.items) {
        const name = (it.productName ?? 'Ürün').trim();
        const key = (it.barcode || it.modelCode || name).toLowerCase();
        const cur = map.get(key) ?? { name, image: imgSrc(it.imagePath), code: it.modelCode || it.barcode || '', total: 0, orders: [] };
        cur.total += qty(it.quantity);
        if (!cur.image && it.imagePath) cur.image = imgSrc(it.imagePath);
        cur.orders.push(`${meta(o).label} ${o.platformOrderNumber || o.saleNumber}`);
        map.set(key, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'tr'));
  };
  const picking = useMemo(() => buildPicking(chosen), [chosen]);
  const printPicking = useMemo(() => buildPicking(printOrders), [printOrders]);

  async function doPrint(mode: 'orders' | 'picking') {
    if (!chosen.length) return;
    const snapshot = [...chosen];
    setPrintOrders(snapshot);
    setPrintMode(mode);
    // Görsellerin yüklenmesini bekle (en fazla 6 sn)
    await new Promise((r) => setTimeout(r, 80));
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.print-area img'));
    await Promise.race([
      Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res; })))),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
    // Yazdırma penceresi kapanınca: baskı alanını temizle, sipariş sayfalarını "yazdırıldı" işaretle
    window.addEventListener('afterprint', () => {
      setPrintMode(null);
      if (mode === 'orders') {
        setPrinted((prev) => {
          const next = { ...prev };
          for (const o of snapshot) next[orderKey(o)] = Date.now();
          savePrinted(next);
          return next;
        });
      }
    }, { once: true });
    window.print();
  }

  const toggle = (k: string) => setSelected((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const togglePlatform = (k: string) => setPlatforms((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const noteOf = (o: OrderRow) => [o.customerNote, String(o.internalNote ?? '').startsWith('Platform siparişi') ? null : o.internalNote]
    .filter(Boolean).join(' · ');

  // Yazdırma alanı AdminShell dışında, doğrudan body'ye (AdminShell içeriği masaüstü+mobil iki kez çiziyor)
  const printArea = (
      <div className="print-area" aria-hidden>
        {printMode === 'orders' && printOrders.map((o) => {
          const m = meta(o);
          const items = o.items;
          const big = items.length <= 2;
          return (
            <section key={orderKey(o)} className="a5-page">
              <header className="a5-head" style={{ borderColor: m.color }}>
                <div className="a5-platform" style={{ background: m.color }}>{m.label}</div>
                <div className="a5-orderno">
                  <div>#{o.platformOrderNumber || o.saleNumber}</div>
                  <small>{fmtDate(o.orderDate ?? o.createdAt)}{o.deliveryDueAt ? ` · Son kargo: ${fmtDate(o.deliveryDueAt)}` : ''}</small>
                </div>
              </header>

              <div className="a5-address">
                <div className="a5-label">ALICI</div>
                <div className="a5-name">{o.customerName}</div>
                {o.phone && <div className="a5-phone">{o.phone}</div>}
                <div className="a5-addr">{o.fullAddress}</div>
                <div className="a5-city">{[o.district, o.city].filter(Boolean).join(' / ')}</div>
                {(o.cargoProvider || o.cargoTrackingNumber) && (
                  <div className="a5-cargo">{[o.cargoProvider, o.cargoTrackingNumber].filter(Boolean).join(' · ')}</div>
                )}
              </div>

              <div className={`a5-items ${big ? 'big' : ''}`}>
                {items.map((it, idx) => (
                  <div key={idx} className="a5-item">
                    {it.imagePath
                      ? <img src={imgSrc(it.imagePath)} alt="" />
                      : <div className="a5-noimg">GÖRSEL YOK</div>}
                    <div className="a5-item-text">
                      <div className="a5-qty">{qty(it.quantity)} ADET</div>
                      <div className="a5-pname">{it.productName}</div>
                      {(it.variationText || it.modelCode || it.barcode) && (
                        <div className="a5-code">{[it.variationText, it.modelCode || it.barcode].filter(Boolean).join(' · ')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {noteOf(o) && <div className="a5-note">Not: {noteOf(o)}</div>}
              <footer className="a5-foot">Erhan Flowers · {new Date().toLocaleDateString('tr-TR')}</footer>
            </section>
          );
        })}

        {printMode === 'picking' && (() => {
          const perPage = 8;
          const pages: typeof printPicking[] = [];
          for (let i = 0; i < printPicking.length; i += perPage) pages.push(printPicking.slice(i, i + perPage));
          return pages.map((page, pi) => (
            <section key={pi} className="a5-page">
              <header className="a5-head" style={{ borderColor: '#17643e' }}>
                <div className="a5-platform" style={{ background: '#17643e' }}>TOPLAMA LİSTESİ</div>
                <div className="a5-orderno">
                  <div>{printOrders.length} sipariş · {printPicking.reduce((s, p) => s + p.total, 0)} adet</div>
                  <small>{new Date().toLocaleString('tr-TR')} · Sayfa {pi + 1}/{pages.length}</small>
                </div>
              </header>
              <div className="pick-grid">
                {page.map((p, idx) => (
                  <div key={idx} className="pick-row">
                    {p.image ? <img src={p.image} alt="" /> : <div className="a5-noimg small">GÖRSEL YOK</div>}
                    <div className="pick-text">
                      <div className="pick-name">{p.name}</div>
                      {p.code && <div className="a5-code">{p.code}</div>}
                      <div className="pick-orders">{p.orders.slice(0, 4).join(', ')}{p.orders.length > 4 ? ` +${p.orders.length - 4}` : ''}</div>
                    </div>
                    <div className="pick-qty">{p.total}</div>
                    <div className="pick-check" />
                  </div>
                ))}
              </div>
            </section>
          ));
        })()}
      </div>
  );

  return (
    <>
    <AdminShell title="Çıktı Merkezi (A5)">
      <div className="screen-only"><OrdersTabs /></div>
      <div className="screen-only mx-auto max-w-5xl space-y-4">
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="font-bold text-slate-800">Tüm platformların kargoya çıkacak siparişleri</div>
              <div className="text-sm text-slate-500">Her sipariş tek A5 sayfa: adres + görselli ürünler. Yazıcı ayarında kâğıt boyutu <b>A5</b> seçin.</div>
            </div>
            <button onClick={() => void load()} className="btn btn-secondary text-sm"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Yenile</button>
          </div>

          <div className="flex flex-wrap gap-2">
            {allPlatformKeys.map((k) => {
              const m = PLATFORM_META[k] ?? { label: k, color: '#334155' };
              const count = orders.filter((o) => platformKey(o) === k && (!onlyUnprinted || !printed[orderKey(o)])).length;
              const on = platforms.has(k);
              return (
                <button
                  key={k}
                  onClick={() => togglePlatform(k)}
                  className="rounded-full border px-3 py-1 text-sm font-semibold"
                  style={on ? { background: m.color, borderColor: m.color, color: '#fff' } : { color: '#64748b' }}
                >
                  {m.label} · {count}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={onlyUnprinted} onChange={(e) => setOnlyUnprinted(e.target.checked)} />
              Sadece daha önce yazdırılmamışlar
            </label>
            <button className="text-blue-600" onClick={() => setSelected(new Set(visible.map(orderKey)))}>Tümünü seç</button>
            <button className="text-slate-500" onClick={() => setSelected(new Set())}>Seçimi kaldır</button>
            <span className="ml-auto font-semibold text-slate-700">{chosen.length} sipariş seçili</span>
          </div>

          {missingImageCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <ImageOff size={16} /> {missingImageCount} üründe görsel bulunamadı — çıktıda &quot;GÖRSEL YOK&quot; yazar, ürün adı ve kodu büyük basılır.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => void doPrint('orders')} disabled={!chosen.length} className="btn btn-primary">
              <Printer size={16} /> A5 Sipariş Sayfaları ({chosen.length})
            </button>
            <button onClick={() => void doPrint('picking')} disabled={!chosen.length} className="btn btn-secondary">
              <ListChecks size={16} /> A5 Toplama Listesi ({picking.length} ürün)
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Yükleniyor…</div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-slate-400">Yazdırılacak sipariş yok.</div>
        ) : (
          <div className="space-y-2">
            {visible.map((o) => {
              const m = meta(o);
              const k = orderKey(o);
              const on = selected.has(k);
              return (
                <div key={k} className={`flex gap-3 rounded-xl border bg-white p-3 ${on ? '' : 'opacity-50'}`}>
                  <button onClick={() => toggle(k)} className="shrink-0 text-slate-600">{on ? <CheckSquare size={20} /> : <Square size={20} />}</button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded px-2 py-0.5 text-xs font-bold text-white" style={{ background: m.color }}>{m.label}</span>
                      <span className="font-semibold">{o.customerName}</span>
                      <span className="text-slate-500">#{o.platformOrderNumber || o.saleNumber}</span>
                      {o.deliveryDueAt && <span className="text-xs text-red-600">Son kargo: {fmtDate(o.deliveryDueAt)}</span>}
                      {printed[k] && <span className="text-xs rounded bg-green-100 px-1.5 text-green-700">Yazdırıldı {fmtDate(new Date(printed[k]).toISOString())}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border px-2 py-1 text-xs">
                          {it.imagePath
                            ? <img src={imgSrc(it.imagePath)} alt="" className="h-10 w-10 rounded object-cover" />
                            : <div className="flex h-10 w-10 items-center justify-center rounded bg-red-50 text-[9px] font-bold text-red-600">GÖRSEL YOK</div>}
                          <span className="max-w-[220px] truncate">{it.productName}</span>
                          <b>×{qty(it.quantity)}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


    </AdminShell>
    {mounted && createPortal(printArea, document.body)}
      <style jsx global>{`
        .print-area { display: none; }
        @media print {
          @page { size: A5 portrait; margin: 6mm; }
          body > *:not(.print-area) { display: none !important; }
          .print-area { display: block !important; }
          body { background: #fff !important; }
        }
        .a5-page {
          box-sizing: border-box;
          width: 100%;
          height: 196mm;
          overflow: hidden;
          page-break-after: always;
          break-after: page;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          display: flex;
          flex-direction: column;
          gap: 3mm;
        }
        .a5-page:last-child { page-break-after: auto; break-after: auto; }
        .a5-head { display: flex; align-items: center; gap: 3mm; border-bottom: 0.8mm solid; padding-bottom: 2mm; }
        .a5-platform { color: #fff; font-weight: 900; font-size: 5mm; padding: 1.5mm 3mm; border-radius: 1.5mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; white-space: nowrap; }
        .a5-orderno { flex: 1; text-align: right; font-weight: 900; font-size: 4.6mm; }
        .a5-orderno small { display: block; font-weight: 600; font-size: 2.8mm; color: #333; }
        .a5-address { border: 0.6mm solid #000; border-radius: 2mm; padding: 2.5mm 3mm; }
        .a5-label { font-size: 2.6mm; font-weight: 800; letter-spacing: 0.4mm; color: #444; }
        .a5-name { font-size: 6.2mm; font-weight: 900; line-height: 1.15; }
        .a5-phone { font-size: 4.4mm; font-weight: 800; }
        .a5-addr { font-size: 4mm; font-weight: 700; line-height: 1.3; margin-top: 1mm; }
        .a5-city { font-size: 5mm; font-weight: 900; margin-top: 1mm; text-transform: uppercase; }
        .a5-cargo { margin-top: 1.5mm; font-size: 3.4mm; font-weight: 800; border-top: 0.3mm dashed #000; padding-top: 1.5mm; }
        .a5-items { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; align-content: start; overflow: hidden; }
        .a5-items.big { grid-template-columns: 1fr; }
        .a5-item { display: flex; gap: 2mm; border: 0.3mm solid #999; border-radius: 1.5mm; padding: 1.5mm; overflow: hidden; }
        .a5-item img, .a5-noimg { width: 26mm; height: 26mm; object-fit: cover; border-radius: 1mm; flex-shrink: 0; }
        .a5-items.big .a5-item img, .a5-items.big .a5-noimg { width: 52mm; height: 52mm; }
        .a5-noimg { display: flex; align-items: center; justify-content: center; text-align: center; border: 0.5mm dashed #000; font-weight: 900; font-size: 3mm; }
        .a5-noimg.small { width: 20mm; height: 20mm; font-size: 2.4mm; }
        .a5-item-text { min-width: 0; }
        .a5-qty { font-size: 5mm; font-weight: 900; }
        .a5-items.big .a5-qty { font-size: 7mm; }
        .a5-pname { font-size: 3.3mm; font-weight: 700; line-height: 1.25; }
        .a5-items.big .a5-pname { font-size: 4.2mm; }
        .a5-code { font-size: 2.8mm; color: #333; font-weight: 600; margin-top: 0.8mm; }
        .a5-note { font-size: 3.4mm; font-weight: 800; border: 0.4mm solid #000; padding: 1.5mm 2mm; border-radius: 1.5mm; }
        .a5-foot { font-size: 2.6mm; color: #555; text-align: right; }
        .pick-grid { display: flex; flex-direction: column; gap: 1.6mm; }
        .pick-row { display: flex; align-items: center; gap: 2.5mm; border-bottom: 0.3mm solid #999; padding-bottom: 1.6mm; }
        .pick-row img { width: 20mm; height: 20mm; object-fit: cover; border-radius: 1mm; flex-shrink: 0; }
        .pick-text { flex: 1; min-width: 0; }
        .pick-name { font-size: 3.4mm; font-weight: 800; line-height: 1.2; }
        .pick-orders { font-size: 2.5mm; color: #444; margin-top: 0.6mm; }
        .pick-qty { font-size: 7mm; font-weight: 900; min-width: 12mm; text-align: center; }
        .pick-check { width: 7mm; height: 7mm; border: 0.6mm solid #000; border-radius: 1mm; flex-shrink: 0; }
      `}</style>
    </>
  );
}
