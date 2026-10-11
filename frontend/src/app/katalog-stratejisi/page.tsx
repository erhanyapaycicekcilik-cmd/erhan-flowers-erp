'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, PackageX, RefreshCw, Send, Store, TrendingUp } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type Tab = 'cleanup' | 'bestsellers';
type Platform = 'TRENDYOL' | 'N11' | 'HEPSIBURADA';

type CleanupItem = {
  barcode: string;
  title: string;
  stockCode: string | null;
  salePrice: number;
  listPrice: number;
  quantity: number;
  soldQuantity: number;
  orderCount: number;
  productUrl: string | null;
};

type CleanupPreview = {
  companyCode: string;
  days: number;
  minSold: number;
  totalListings: number;
  onSale: number;
  alreadyClosed: number;
  keep: CleanupItem[];
  close: CleanupItem[];
  confirmText: string;
};

type MarketItem = {
  keyword: string;
  rank: number;
  productName: string;
  brand: string | null;
  productUrl: string | null;
  price: number;
  ratingAverage: number | null;
  ratingCount: number;
  favoriteCount: number;
  score: number;
  suggestedPrice: number;
};

type OwnItem = {
  key: string;
  variantId: number | null;
  status: string | null;
  productName: string;
  soldQuantity: number;
  floraSoldQuantity: number;
  orderCount: number;
  currentPrice: number | null;
  cost: number | null;
  floorPrice: number | null;
  competitorPrice: number | null;
  competitorName: string | null;
  competitorUrl: string | null;
  suggestedPrice: number | null;
  imageReady: boolean;
};

type Bestsellers = {
  keywords: string[];
  failedKeywords: string[];
  market: MarketItem[];
  own: OwnItem[];
};

type PublishResult = {
  total: number;
  success: number;
  failed: number;
  results: Array<{ id: number; companyCode: string; platform: string; barcode: string; ok: boolean; errorMessage?: string | null; missingFields?: string[] }>;
};

const STORES = [
  { code: 'ERHAN', label: 'Erhan Flowers' },
  { code: 'FLORA', label: 'Flora Yapay Çiçek' },
];
const PLATFORMS: Array<{ code: Platform; label: string }> = [
  { code: 'TRENDYOL', label: 'Trendyol' },
  { code: 'N11', label: 'N11' },
  { code: 'HEPSIBURADA', label: 'Hepsiburada' },
];

const money = (value: number | null | undefined) =>
  value == null ? '—' : `${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

export default function CatalogStrategyPage() {
  const [tab, setTab] = useState<Tab>('cleanup');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <AdminShell title="Katalog Stratejisi">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Katalog Stratejisi</h2>
        <p className="text-sm text-slate-500">
          Satmayan ürünleri tüm pazaryerlerinde satışa kapat, en çok satanları uygun fiyatla Erhan Flowers ve Flora mağazalarına aynı anda aç.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton active={tab === 'cleanup'} onClick={() => setTab('cleanup')} icon={<PackageX size={15} />} label="1. Satmayanları Kapat" />
        <TabButton active={tab === 'bestsellers'} onClick={() => setTab('bestsellers')} icon={<TrendingUp size={15} />} label="2. En Çok Satanlar → İki Mağazaya Aç" />
      </div>

      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 whitespace-pre-line">{message}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">{error}</div>}

      {tab === 'cleanup' ? (
        <CleanupPanel onMessage={(text) => { setError(''); setMessage(text); }} onError={(text) => { setMessage(''); setError(text); }} />
      ) : (
        <BestsellerPanel onMessage={(text) => { setError(''); setMessage(text); }} onError={(text) => { setMessage(''); setError(text); }} />
      )}
    </AdminShell>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
    >
      {icon} {label}
    </button>
  );
}

function PlatformPicker({ value, onChange }: { value: Platform[]; onChange: (value: Platform[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {PLATFORMS.map((platform) => (
        <label key={platform.code} className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={value.includes(platform.code)}
            onChange={(event) => onChange(event.target.checked ? [...value, platform.code] : value.filter((item) => item !== platform.code))}
          />
          {platform.label}
        </label>
      ))}
    </div>
  );
}

// ---------------- 1) Satmayanları kapat ----------------

function CleanupPanel({ onMessage, onError }: { onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [company, setCompany] = useState('ERHAN');
  const [days, setDays] = useState(90);
  const [minSold, setMinSold] = useState(1);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(['TRENDYOL', 'N11', 'HEPSIBURADA']);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  async function loadPreview() {
    setLoading(true);
    setPreview(null);
    try {
      const data = await api<CleanupPreview>(`/catalog-strategy/cleanup/preview?company=${company}&days=${days}&minSold=${minSold}`);
      setPreview(data);
      setSelected(data.close.map((item) => item.barcode));
      setConfirmText('');
      onMessage(`${data.onSale} ürün satışta: ${data.keep.length} ürün son ${data.days} günde satmış (kalacak), ${data.close.length} ürün satmamış (kapatılacak).`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Önizleme alınamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!preview) return;
    const items = preview.close.filter((item) => selected.includes(item.barcode));
    if (items.length === 0) return onError('Kapatılacak ürün seçilmedi.');
    setApplying(true);
    try {
      const result = await api<{ requested: number; passivated: number; results: Array<{ platform: string; ok: boolean; message: string }> }>(
        '/catalog-strategy/cleanup/apply',
        {
          method: 'POST',
          json: {
            companyCode: preview.companyCode,
            platforms,
            confirmText,
            items: items.map((item) => ({ barcode: item.barcode, stockCode: item.stockCode, salePrice: item.salePrice, listPrice: item.listPrice })),
          },
        },
      );
      const lines = result.results.map((item) => `${item.ok ? '✓' : '✗'} ${item.platform}: ${item.message}`);
      onMessage(`${result.requested} ürün için satışa kapatma gönderildi. ERP'de pasife alınan: ${result.passivated}.\n${lines.join('\n')}`);
      setConfirmText('');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Kapatma işlemi yapılamadı.');
    } finally {
      setApplying(false);
    }
  }

  const allSelected = preview != null && preview.close.length > 0 && selected.length === preview.close.length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Mağaza</span>
            <select className="rounded-lg border border-slate-300 px-3 py-2" value={company} onChange={(event) => setCompany(event.target.value)}>
              {STORES.map((store) => <option key={store.code} value={store.code}>{store.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Son kaç gün</span>
            <input type="number" min={7} max={365} className="w-24 rounded-lg border border-slate-300 px-3 py-2" value={days} onChange={(event) => setDays(Number(event.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">En az satış adedi</span>
            <input type="number" min={1} className="w-24 rounded-lg border border-slate-300 px-3 py-2" value={minSold} onChange={(event) => setMinSold(Number(event.target.value))} />
          </label>
          <button onClick={loadPreview} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {loading ? 'Trendyol ürünleri okunuyor…' : 'Analiz Et'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Ürünler silinmez: stok 0 yapılarak satışa kapatılır, yorum/puan geçmişi korunur. Kapatılan ürünler ERP'de pasife alınır ve ürün kaydı sırasında tekrar satışa açılmaz.
        </p>
      </div>

      {preview && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Trendyol'daki ürün" value={preview.totalListings} />
            <Stat label="Satışta (stoklu)" value={preview.onSale} />
            <Stat label="Kalacak (çok satan)" value={preview.keep.length} tone="green" />
            <Stat label="Kapatılacak" value={preview.close.length} tone="red" />
          </div>

          <div className="rounded-xl border border-red-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 px-4 py-3">
              <h3 className="font-semibold text-red-700">Satışa kapatılacaklar ({selected.length}/{preview.close.length} seçili)</h3>
              <button className="text-sm text-slate-600 underline" onClick={() => setSelected(allSelected ? [] : preview.close.map((item) => item.barcode))}>
                {allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
              </button>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                  <tr><th className="p-2" /><th className="p-2">Ürün</th><th className="p-2">Barkod</th><th className="p-2 text-right">Fiyat</th><th className="p-2 text-right">Stok</th></tr>
                </thead>
                <tbody>
                  {preview.close.map((item) => (
                    <tr key={item.barcode} className="border-t border-slate-100">
                      <td className="p-2">
                        <input type="checkbox" checked={selected.includes(item.barcode)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.barcode] : current.filter((value) => value !== item.barcode))} />
                      </td>
                      <td className="p-2">{item.title}</td>
                      <td className="p-2 font-mono text-xs">{item.barcode}</td>
                      <td className="p-2 text-right">{money(item.salePrice)}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 border-t border-red-100 p-4">
              <PlatformPicker value={platforms} onChange={setPlatforms} />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder={`Onay için "${preview.confirmText}" yazın`}
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                />
                <button
                  onClick={apply}
                  disabled={applying || confirmText.trim().toUpperCase() !== preview.confirmText || selected.length === 0 || platforms.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                >
                  <PackageX size={15} /> {applying ? 'Kapatılıyor…' : `${selected.length} ürünü satışa kapat`}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white">
            <h3 className="border-b border-emerald-100 px-4 py-3 font-semibold text-emerald-700">Satışta kalacak çok satanlar ({preview.keep.length})</h3>
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                  <tr><th className="p-2">Ürün</th><th className="p-2 text-right">Satış adedi</th><th className="p-2 text-right">Sipariş</th><th className="p-2 text-right">Fiyat</th></tr>
                </thead>
                <tbody>
                  {preview.keep.map((item) => (
                    <tr key={item.barcode} className="border-t border-slate-100">
                      <td className="p-2">{item.title}</td>
                      <td className="p-2 text-right font-semibold">{item.soldQuantity}</td>
                      <td className="p-2 text-right">{item.orderCount}</td>
                      <td className="p-2 text-right">{money(item.salePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString('tr-TR')}</div>
    </div>
  );
}

// ---------------- 2) En çok satanlar + iki mağazaya aç ----------------

function BestsellerPanel({ onMessage, onError }: { onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [keywords, setKeywords] = useState('');
  const [discountPercent, setDiscountPercent] = useState(5);
  const [minMarginPercent, setMinMarginPercent] = useState(25);
  const [data, setData] = useState<Bestsellers | null>(null);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [stores, setStores] = useState({ ERHAN: true, FLORA: true });
  const [floraPrefix, setFloraPrefix] = useState('FL-');
  const [floraPricePercent, setFloraPricePercent] = useState(-3);
  const [platforms, setPlatforms] = useState<Platform[]>(['TRENDYOL']);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ keywords, discountPercent: String(discountPercent), minMarginPercent: String(minMarginPercent) });
      const result = await api<Bestsellers>(`/catalog-strategy/bestsellers?${params}`);
      setData(result);
      const initial: Record<number, string> = {};
      for (const item of result.own) if (item.variantId && item.suggestedPrice) initial[item.variantId] = String(item.suggestedPrice);
      setPrices(initial);
      setSelected([]);
      onMessage(`${result.keywords.length} anahtar kelimede ${result.market.length} pazar ürünü, ${result.own.length} kendi çok satanımız bulundu.${result.failedKeywords.length ? `\nTrendyol'dan okunamayan: ${result.failedKeywords.join(', ')}` : ''}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Analiz yapılamadı.');
    } finally {
      setLoading(false);
    }
  }

  const publishable = useMemo(() => (data?.own ?? []).filter((item) => item.variantId != null), [data]);

  async function publish() {
    const chosenStores = [
      stores.ERHAN ? { companyCode: 'ERHAN', barcodePrefix: '', priceMultiplier: 1 } : null,
      stores.FLORA ? { companyCode: 'FLORA', barcodePrefix: floraPrefix, priceMultiplier: 1 + floraPricePercent / 100 } : null,
    ].filter(Boolean);
    if (chosenStores.length === 0) return onError('En az bir mağaza seçin.');
    if (selected.length === 0) return onError('Ürün seçin.');
    setPublishing(true);
    setPublishResult(null);
    try {
      const result = await api<PublishResult>('/catalog-strategy/publish', {
        method: 'POST',
        json: {
          items: selected.map((variantId) => ({ variantId, salePrice: Number(prices[variantId] || 0) })),
          stores: chosenStores,
          platforms,
        },
      });
      setPublishResult(result);
      onMessage(`${result.success} gönderim başarılı, ${result.failed} başarısız. Trendyol gönderimleri kuyrukta işlenir; birkaç dakika içinde mağazada görünür.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gönderim yapılamadı.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1 text-sm">
            <span className="mb-1 block text-slate-500">Anahtar kelimeler (virgülle; boşsa Pazar Analizi listesi)</span>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="yapay çiçek, yapay ağaç, yapay orkide" value={keywords} onChange={(event) => setKeywords(event.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Rakipten ucuz (%)</span>
            <input type="number" min={0} max={50} className="w-24 rounded-lg border border-slate-300 px-3 py-2" value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.target.value))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Min. kâr marjı (%)</span>
            <input type="number" min={0} className="w-24 rounded-lg border border-slate-300 px-3 py-2" value={minMarginPercent} onChange={(event) => setMinMarginPercent(Number(event.target.value))} />
          </label>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {loading ? 'Pazar taranıyor…' : 'En Çok Satanları Bul'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Önerilen fiyat = benzer rakip fiyatı − %{discountPercent}; ama maliyet + %{minMarginPercent} kâr + komisyonun altına inmez (taban fiyat).
        </p>
      </div>

      {data && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold">Bizim çok satanlarımız — iki mağazaya aç</h3>
              <button className="text-sm text-slate-600 underline" onClick={() => setSelected(selected.length === publishable.length ? [] : publishable.map((item) => item.variantId!))}>
                {selected.length === publishable.length && publishable.length > 0 ? 'Seçimi kaldır' : 'Tümünü seç'}
              </button>
            </div>
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="p-2" />
                    <th className="p-2">Ürün</th>
                    <th className="p-2 text-right">Satış (Flora)</th>
                    <th className="p-2 text-right">Maliyet</th>
                    <th className="p-2 text-right">Taban</th>
                    <th className="p-2 text-right">Rakip</th>
                    <th className="p-2 text-right">Şu anki</th>
                    <th className="p-2 text-right">Yeni fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.own.map((item) => {
                    const id = item.variantId;
                    const price = id ? Number(prices[id] || 0) : 0;
                    const belowFloor = item.floorPrice != null && price > 0 && price < item.floorPrice;
                    return (
                      <tr key={item.key} className="border-t border-slate-100">
                        <td className="p-2">
                          {id ? (
                            <input type="checkbox" checked={selected.includes(id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))} />
                          ) : (
                            <span title="ERP'de ürün kartı yok" className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-2">
                          <div>{item.productName}</div>
                          <div className="text-xs text-slate-400">
                            {item.key}
                            {item.status === 'PASSIVE' && <span className="ml-2 rounded bg-amber-100 px-1.5 text-amber-700">kapalı</span>}
                            {!item.imageReady && id && <span className="ml-2 rounded bg-red-100 px-1.5 text-red-700">görsel yok</span>}
                          </div>
                        </td>
                        <td className="p-2 text-right font-semibold">{item.soldQuantity} <span className="font-normal text-slate-400">({item.floraSoldQuantity})</span></td>
                        <td className="p-2 text-right">{money(item.cost)}</td>
                        <td className="p-2 text-right">{money(item.floorPrice)}</td>
                        <td className="p-2 text-right">
                          {item.competitorUrl ? (
                            <a href={item.competitorUrl} target="_blank" rel="noreferrer" title={item.competitorName ?? ''} className="text-blue-600 underline">{money(item.competitorPrice)}</a>
                          ) : money(item.competitorPrice)}
                        </td>
                        <td className="p-2 text-right">{money(item.currentPrice)}</td>
                        <td className="p-2 text-right">
                          {id ? (
                            <input
                              type="number"
                              step="0.01"
                              className={`w-28 rounded border px-2 py-1 text-right ${belowFloor ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                              value={prices[id] ?? ''}
                              onChange={(event) => setPrices((current) => ({ ...current, [id]: event.target.value }))}
                              title={belowFloor ? 'Taban fiyatın altında — zarar riski' : ''}
                            />
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 border-t border-slate-100 p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1 font-semibold"><Store size={15} /> Mağazalar:</span>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={stores.ERHAN} onChange={(event) => setStores((current) => ({ ...current, ERHAN: event.target.checked }))} /> Erhan Flowers (barkod aynen)
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={stores.FLORA} onChange={(event) => setStores((current) => ({ ...current, FLORA: event.target.checked }))} /> Flora
                </label>
                <label className="flex items-center gap-1.5">
                  barkod ön eki
                  <input className="w-20 rounded border border-slate-300 px-2 py-1 font-mono" value={floraPrefix} onChange={(event) => setFloraPrefix(event.target.value.toUpperCase())} />
                </label>
                <label className="flex items-center gap-1.5">
                  fiyat farkı %
                  <input type="number" min={-30} max={30} className="w-20 rounded border border-slate-300 px-2 py-1" value={floraPricePercent} onChange={(event) => setFloraPricePercent(Number(event.target.value))} />
                </label>
              </div>
              <PlatformPicker value={platforms} onChange={setPlatforms} />
              <button
                onClick={publish}
                disabled={publishing || selected.length === 0 || platforms.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                <Send size={15} /> {publishing ? 'Gönderiliyor…' : `${selected.length} ürünü seçili mağazalara aç`}
              </button>
              {publishResult && publishResult.failed > 0 && (
                <ul className="space-y-1 text-xs text-red-700">
                  {publishResult.results.filter((item) => !item.ok).slice(0, 30).map((item, index) => (
                    <li key={index}>
                      {item.companyCode} / {item.platform} / {item.barcode}: {item.missingFields?.length ? `Eksik: ${item.missingFields.join(', ')}` : item.errorMessage}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <h3 className="border-b border-slate-100 px-4 py-3 font-semibold">Trendyol'da en çok satan / değerlendirilen rakip ürünler</h3>
            <p className="px-4 pt-3 text-xs text-slate-500">
              Bu ürünler bizde yoksa: üretip/tedarik edip ERP'de ürün kartı açın (kendi fotoğrafınızla), sonra yukarıdan iki mağazaya açın. Rakip görsel ve metinleri kopyalanmamalı.
            </p>
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="p-2">Ürün</th>
                    <th className="p-2">Kelime</th>
                    <th className="p-2 text-right">Değerlendirme</th>
                    <th className="p-2 text-right">Favori</th>
                    <th className="p-2 text-right">Rakip fiyat</th>
                    <th className="p-2 text-right">Bizim öneri</th>
                  </tr>
                </thead>
                <tbody>
                  {data.market.map((item, index) => (
                    <tr key={`${item.productUrl}-${index}`} className="border-t border-slate-100">
                      <td className="p-2">
                        {item.productUrl ? (
                          <a href={item.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                            {item.productName} <ExternalLink size={12} />
                          </a>
                        ) : item.productName}
                        {item.brand && <div className="text-xs text-slate-400">{item.brand}</div>}
                      </td>
                      <td className="p-2 text-xs text-slate-500">{item.keyword} #{item.rank}</td>
                      <td className="p-2 text-right">{item.ratingCount.toLocaleString('tr-TR')}{item.ratingAverage ? ` (${item.ratingAverage.toFixed(1)}★)` : ''}</td>
                      <td className="p-2 text-right">{item.favoriteCount.toLocaleString('tr-TR')}</td>
                      <td className="p-2 text-right">{money(item.price)}</td>
                      <td className="p-2 text-right font-semibold text-emerald-700">{money(item.suggestedPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
