'use client';

// Flora Yapay Çiçek — ayrı ürün yükleme sayfası.
// Bu sayfada SADECE Flora işleri vardır: yeni Flora ürünü aç, Flora ürünlerini listele, Flora hesaplarına gönder.
// Erhan Flowers'ın toplu butonları burada yoktur; buradan açılan ürün Erhan hesaplarına gitmez.
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Image as ImageIcon, PackagePlus, RefreshCw, Send, ShoppingCart, Trash2, XCircle } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';
import type { Category, MediaFile } from '@/types';

type FloraEntry = {
  variantId: number;
  productName: string;
  barcode: string;
  modelCode: string;
  salePrice: number;
  stockQuantity: number;
  images: string[];
  status: 'ACTIVE' | 'PASSIVE';
  storeCode?: string;
  updatedAt?: string;
};

type SendResult = { platform: string; ok: boolean; errorMessage?: string | null; successMessage?: string | null };

const PLATFORMS = [
  { value: 'TRENDYOL', label: 'Trendyol' },
  { value: 'HEPSIBURADA', label: 'Hepsiburada' },
  { value: 'N11', label: 'N11' },
  { value: 'TRENDRUM', label: 'Trendrum' },
];

const platformName = (value: string) =>
  value === 'TRENDYOL_FLORA' ? 'Trendyol' : PLATFORMS.find((p) => p.value === value)?.label ?? value;

const emptyForm = {
  productName: '',
  categoryId: '',
  productType: '',
  sizeVariant: '',
  marketPrice: 0,
  stock: 1,
  description: '',
};

const imageSrc = (path: string) => (!path ? '' : /^https?:\/\//i.test(path) ? path : apiFileUrl(path));
const money = (value: number) => `${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;

export default function FloraProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<FloraEntry[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(['TRENDYOL', 'HEPSIBURADA', 'N11']);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastResult, setLastResult] = useState<{ productName: string; modelCode: string; barcode: string; results: SendResult[] } | null>(null);
  const [rowResults, setRowResults] = useState<Record<number, SendResult[]>>({});
  const [search, setSearch] = useState('');
  const [showPassive, setShowPassive] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api<FloraEntry[]>('/product-center/entries?store=FLORA');
      // Güvenlik: sadece Flora ürünleri
      setEntries(data.filter((e) => e.storeCode === 'FLORA'));
    } catch {
      setEntries([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    api<Category[]>('/categories').then(setCategories).catch(() => setCategories([]));
    loadEntries();
  }, [loadEntries]);

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    return entries
      .filter((e) => showPassive || e.status !== 'PASSIVE')
      .filter((e) => !needle || [e.productName, e.barcode, e.modelCode].join(' ').toLocaleLowerCase('tr-TR').includes(needle))
      .sort((a, b) => b.variantId - a.variantId);
  }, [entries, search, showPassive]);

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const data = new FormData();
        data.append('folderName', form.productName || 'Flora Urun');
        data.append('file', file);
        const media = await api<MediaFile>('/media/upload', { method: 'POST', body: data });
        uploaded.push(media.filePath);
      }
      setImages((current) => [...current, ...uploaded].slice(0, 8));
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Görsel yüklenemedi.' });
    } finally {
      setUploading(false);
    }
  }

  async function sendToPlatforms(variantId: number, selected: string[]) {
    const result = await api<{ results: SendResult[] }>('/publishing/send', {
      method: 'POST',
      json: { variantIds: [variantId], platforms: selected, allowIncomplete: true },
    });
    return result.results ?? [];
  }

  async function save(event: FormEvent, sendNow: boolean) {
    event.preventDefault();
    setMessage(null);
    if (!form.productName.trim()) return setMessage({ ok: false, text: 'Ürün adı yazın.' });
    if (!form.categoryId) return setMessage({ ok: false, text: 'Kategori seçin.' });
    if (!form.productType.trim()) return setMessage({ ok: false, text: 'Ürün türü yazın (ör. Yapay ağaç).' });
    if (!form.sizeVariant.trim()) return setMessage({ ok: false, text: 'Ölçü / varyant yazın (ör. 150 cm).' });
    if (!(Number(form.marketPrice) > 0)) return setMessage({ ok: false, text: 'Satış fiyatı girin.' });
    if (images.length === 0) return setMessage({ ok: false, text: 'En az bir ürün görseli yükleyin.' });
    if (sendNow && platforms.length === 0) return setMessage({ ok: false, text: 'Gönderilecek en az bir pazaryeri seçin.' });

    setSaving(true);
    try {
      const saved = await api<{ variantId: number; modelCode: string; barcode: string; productName: string }>('/product-center/entries/quick', {
        method: 'POST',
        json: {
          storeCode: 'FLORA',
          productName: form.productName.trim(),
          categoryId: Number(form.categoryId),
          productType: form.productType.trim(),
          sizeVariant: form.sizeVariant.trim(),
          marketPrice: Number(form.marketPrice),
          initialStockQuantity: Number(form.stock) || 0,
          mainImageUrl: images[0],
          imageUrls: images,
          description: form.description.trim() || undefined,
        },
      });
      let results: SendResult[] = [];
      if (sendNow) {
        try {
          results = await sendToPlatforms(saved.variantId, platforms);
        } catch (error) {
          results = platforms.map((p) => ({ platform: p, ok: false, errorMessage: error instanceof Error ? error.message : 'Gönderim başlatılamadı.' }));
        }
      }
      setLastResult({ productName: saved.productName, modelCode: saved.modelCode, barcode: saved.barcode, results });
      setMessage({ ok: true, text: sendNow ? 'Flora ürünü kaydedildi ve seçili pazaryerlerine gönderildi.' : 'Flora ürünü kaydedildi.' });
      setForm((current) => ({ ...emptyForm, categoryId: current.categoryId, productType: current.productType }));
      setImages([]);
      await loadEntries();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Ürün kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  }

  async function resend(entry: FloraEntry) {
    if (platforms.length === 0) return setMessage({ ok: false, text: 'Üstten gönderilecek pazaryerlerini seçin.' });
    setSendingId(entry.variantId);
    try {
      const results = await sendToPlatforms(entry.variantId, platforms);
      setRowResults((current) => ({ ...current, [entry.variantId]: results }));
    } catch (error) {
      setRowResults((current) => ({ ...current, [entry.variantId]: [{ platform: '-', ok: false, errorMessage: error instanceof Error ? error.message : 'Gönderilemedi.' }] }));
    } finally {
      setSendingId(null);
    }
  }

  return (
    <AdminShell title="Flora Yapay Çiçek — Ürün Yükleme">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-md border-2 border-pink-300 bg-pink-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-pink-800">Flora Yapay Çiçek — Ürün Yükleme</h1>
              <p className="text-sm text-pink-900">
                Bu sayfa sadece Flora mağazası içindir. Burada açılan ürünler sadece Flora&apos;nın Trendyol, Hepsiburada, N11 ve Trendrum hesaplarına gider;
                Erhan Flowers&apos;a ve erhanflowers.com sitesine gitmez.
              </p>
            </div>
            <Link href="/orders?magaza=FLORA" className="btn btn-secondary"><ShoppingCart size={16} /> Flora Siparişleri</Link>
          </div>
        </div>

        {message && (
          <div className={`rounded-md px-3 py-2 text-sm font-semibold ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{message.text}</div>
        )}

        {lastResult && (
          <div className="rounded-md border border-emerald-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 font-black text-emerald-800"><CheckCircle2 size={18} /> {lastResult.productName}</div>
            <div className="text-sm text-slate-600">Model kodu: <b>{lastResult.modelCode}</b> · Barkod: <b>{lastResult.barcode}</b></div>
            {lastResult.results.length > 0 && <ResultList results={lastResult.results} />}
          </div>
        )}

        <form className="panel space-y-4 p-4" onSubmit={(event) => save(event, false)}>
          <h2 className="text-lg font-black">Yeni Flora Ürünü</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Ürün adı</span>
              <input className="field" value={form.productName} onChange={(e) => update('productName', e.target.value)} placeholder="Ör: Yapay Zeytin Ağacı 150 cm Siyah Saksılı" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Kategori</span>
              <select className="field" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
                <option value="">Seçin</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Ürün türü</span>
              <input className="field" value={form.productType} onChange={(e) => update('productType', e.target.value)} placeholder="Yapay ağaç, çiçek, saksı…" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Ölçü / varyant</span>
              <input className="field" value={form.sizeVariant} onChange={(e) => update('sizeVariant', e.target.value)} placeholder="150 cm, beyaz, 30x30…" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Pazaryeri satış fiyatı (TL)</span>
              <input className="field" type="number" inputMode="decimal" min="0" step="1" value={form.marketPrice || ''} onChange={(e) => update('marketPrice', Number(e.target.value))} placeholder="Ör: 1499" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Stok adedi</span>
              <input className="field" type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={(e) => update('stock', Number(e.target.value))} />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Açıklama (pazaryerinde görünür)</span>
              <textarea className="field min-h-24" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Ürünün boyu, malzemesi, saksı bilgisi…" />
            </label>
          </div>

          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-600">Görseller (ilk görsel ana görsel, en fazla 8)</span>
            <div className="flex flex-wrap gap-2">
              {images.map((path, index) => (
                <div key={path} className="relative">
                  <img src={imageSrc(path)} alt="" className="h-20 w-20 rounded-md border border-line object-cover" />
                  {index === 0 && <span className="absolute left-1 top-1 rounded bg-pink-600 px-1 text-[10px] font-bold text-white">Ana</span>}
                  <button type="button" className="absolute -right-2 -top-2 rounded-full bg-white p-0.5 text-red-600 shadow" onClick={() => setImages((current) => current.filter((item) => item !== path))} aria-label="Görseli kaldır">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {images.length < 8 && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-pink-300 text-xs font-semibold text-pink-700">
                  {uploading ? <RefreshCw size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                  {uploading ? 'Yükleniyor' : 'Görsel ekle'}
                  <input className="hidden" type="file" accept="image/*" multiple onChange={(e) => { uploadImages(e.target.files); e.target.value = ''; }} />
                </label>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Telefonda &quot;Görsel ekle&quot;ye dokununca kamera veya galeri açılır.</p>
          </div>

          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-600">Gönderilecek Flora hesapları</span>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label key={p.value} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${platforms.includes(p.value) ? 'border-pink-500 bg-pink-50 text-pink-800' : 'border-line bg-white text-slate-600'}`}>
                  <input type="checkbox" checked={platforms.includes(p.value)} onChange={() => setPlatforms((current) => current.includes(p.value) ? current.filter((x) => x !== p.value) : [...current, p.value])} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn bg-pink-600 text-white hover:bg-pink-700" disabled={saving || uploading} onClick={(e) => save(e as unknown as FormEvent, true)}>
              <Send size={16} /> {saving ? 'Kaydediliyor…' : 'Kaydet ve Flora Hesaplarına Gönder'}
            </button>
            <button type="submit" className="btn btn-secondary" disabled={saving || uploading}><PackagePlus size={16} /> Sadece Kaydet</button>
          </div>
        </form>

        <section className="panel p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-black">Flora Ürünleri ({entries.filter((e) => e.status !== 'PASSIVE').length})</h2>
            <input className="field max-w-xs" placeholder="Ürün, barkod, model ara" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <input type="checkbox" checked={showPassive} onChange={(e) => setShowPassive(e.target.checked)} /> Pasifleri göster
            </label>
            <button type="button" className="btn btn-secondary ml-auto" onClick={loadEntries}><RefreshCw size={16} /> Yenile</button>
          </div>
          {loadingList ? (
            <div className="text-sm text-slate-500">Yükleniyor…</div>
          ) : visibleEntries.length === 0 ? (
            <div className="rounded-md border border-dashed border-line p-4 text-sm text-slate-500">Henüz Flora ürünü yok. Yukarıdaki formdan ilk ürünü açabilirsin.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {visibleEntries.map((entry) => (
                <div key={entry.variantId} className={`rounded-md border border-line p-3 ${entry.status === 'PASSIVE' ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3">
                    {entry.images?.[0]
                      ? <img src={imageSrc(entry.images[0])} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                      : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400"><ImageIcon size={20} /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-bold">{entry.productName}</div>
                      <div className="text-xs text-slate-500">{entry.modelCode} · {entry.barcode}</div>
                      <div className="mt-1 text-xs"><b>{money(entry.salePrice)}</b> · Stok {entry.stockQuantity}{entry.status === 'PASSIVE' ? ' · Pasif' : ''}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-secondary min-h-9 px-3 text-xs" disabled={sendingId === entry.variantId} onClick={() => resend(entry)}>
                      <Send size={14} /> {sendingId === entry.variantId ? 'Gönderiliyor…' : `Gönder (${platforms.map(platformName).join(', ') || 'seçilmedi'})`}
                    </button>
                    <Link href={`/urun-duzenle/${entry.variantId}`} className="btn btn-secondary min-h-9 px-3 text-xs">Açıklama / görsel düzenle</Link>
                  </div>
                  {rowResults[entry.variantId] && <ResultList results={rowResults[entry.variantId]} />}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function ResultList({ results }: { results: SendResult[] }) {
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {results.map((r, index) => (
        <li key={`${r.platform}-${index}`} className={`flex items-start gap-2 ${r.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {r.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
          <span><b>{platformName(r.platform)}:</b> {r.ok ? (r.successMessage || 'Gönderildi') : (r.errorMessage || 'Hata')}</span>
        </li>
      ))}
    </ul>
  );
}
