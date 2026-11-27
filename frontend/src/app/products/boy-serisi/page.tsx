'use client';

import { useState } from 'react';
import { Eye, Ruler, Send } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type PreviewItem = {
  size: number;
  delta: number;
  modelCode: string;
  productName: string;
  trendyolSalePrice: number;
  n11SalePrice: number;
  hepsiburadaSalePrice: number;
  exists: boolean;
};

type Preview = {
  source: { variantId: number; modelCode: string; productName: string; baseSize: number; trendyolSalePrice: number; stockQuantity: number; imageCount: number };
  items: PreviewItem[];
};

type CreatedItem = { size: number; modelCode: string; productName: string; barcode: string; variantId: number; created: boolean; trendyolSalePrice: number };

type SendResult = { id: number; platform: string; ok: boolean; errorMessage?: string | null };

// Kopyalar kaynak ürünün mağazasında açılır ve o mağazanın hesaplarına gider
// (Erhan ürünü → Erhan hesapları, Flora ürünü (FL-) → Flora hesapları).
const PLATFORMS = [
  { key: 'TRENDYOL', label: 'Trendyol' },
  { key: 'N11', label: 'N11' },
  { key: 'HEPSIBURADA', label: 'Hepsiburada' },
  { key: 'TRENDRUM', label: 'Trendrum (sadece Flora)' },
];

const money = (value: number) => `${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;

export default function SizeSeriesPage() {
  const [form, setForm] = useState({
    modelCode: 'ERH-BS2105',
    startCm: 100,
    endCm: 200,
    stepCm: 10,
    priceStep: 100,
    nameFrom: 'Antrasit Saksıda',
    nameTo: 'Siyah Mat Saksıda',
  });
  const [platforms, setPlatforms] = useState<string[]>(['TRENDYOL', 'N11', 'HEPSIBURADA']);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [created, setCreated] = useState<CreatedItem[]>([]);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [busy, setBusy] = useState<'' | 'preview' | 'create'>('');
  const [message, setMessage] = useState('');

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
  }

  async function loadPreview() {
    setBusy('preview');
    setMessage('');
    setCreated([]);
    setSendResults([]);
    try {
      setPreview(await api<Preview>('/product-center/size-series/preview', { method: 'POST', json: form }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Önizleme alınamadı.');
    } finally {
      setBusy('');
    }
  }

  async function createAndSend() {
    if (!preview) return;
    const newCount = preview.items.filter((item) => !item.exists).length;
    if (!window.confirm(`${newCount} yeni ürün açılacak${platforms.length ? ' ve seçili platformlara gönderilecek' : ''}. Devam edilsin mi?`)) return;
    setBusy('create');
    setMessage('Ürünler oluşturuluyor...');
    setSendResults([]);
    try {
      const result = await api<{ items: CreatedItem[] }>('/product-center/size-series', { method: 'POST', json: form });
      setCreated(result.items);
      if (platforms.length === 0) {
        setMessage(`${result.items.filter((item) => item.created).length} ürün oluşturuldu. Platform seçilmediği için gönderim yapılmadı.`);
        return;
      }
      setMessage('Ürünler oluşturuldu, platformlara gönderiliyor...');
      const sent = await api<{ success: number; failed: number; results: SendResult[] }>('/publishing/send', {
        method: 'POST',
        json: { variantIds: result.items.map((item) => item.variantId), platforms },
      });
      setSendResults(sent.results);
      setMessage(`Tamamlandı. Gönderim başarılı: ${sent.success}, hatalı: ${sent.failed}. Trendyol onayı birkaç dakika sürebilir.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'İşlem başarısız.');
    } finally {
      setBusy('');
    }
  }

  const labelOf = (key: string) => (key === 'TRENDYOL_FLORA' ? 'Trendyol (Flora)' : PLATFORMS.find((item) => item.key === key)?.label ?? key);

  return (
    <AdminShell title="Boy Serisi Oluştur">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Ruler size={20} /> Boy Serisi Oluştur</h2>
        <p className="text-sm text-slate-500">
          Bir ürünü farklı boylarda <b>ayrı ürün / ayrı ilan</b> olarak açar. Görsel, açıklama ve kategori kaynaktan kopyalanır;
          her boyun kendi model kodu (ör. ERH-BS2105-100) ve yeni barkodu olur. Fiyat her adımda belirtilen tutar kadar artar/azalır.
        </p>
      </div>

      <div className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-4">
        <label className="text-sm md:col-span-2">Kaynak model kodu / barkod
          <input className="field mt-1" value={form.modelCode} onChange={(e) => update('modelCode', e.target.value)} />
        </label>
        <label className="text-sm">Başlangıç boyu (cm)
          <input className="field mt-1" type="number" value={form.startCm} onChange={(e) => update('startCm', Number(e.target.value))} />
        </label>
        <label className="text-sm">Bitiş boyu (cm)
          <input className="field mt-1" type="number" value={form.endCm} onChange={(e) => update('endCm', Number(e.target.value))} />
        </label>
        <label className="text-sm">Adım (cm)
          <input className="field mt-1" type="number" value={form.stepCm} onChange={(e) => update('stepCm', Number(e.target.value))} />
        </label>
        <label className="text-sm">Adım başına fiyat farkı (TL)
          <input className="field mt-1" type="number" value={form.priceStep} onChange={(e) => update('priceStep', Number(e.target.value))} />
        </label>
        <label className="text-sm">İsimde değiştir
          <input className="field mt-1" value={form.nameFrom} onChange={(e) => update('nameFrom', e.target.value)} placeholder="(boş = değiştirme)" />
        </label>
        <label className="text-sm">Yerine yaz
          <input className="field mt-1" value={form.nameTo} onChange={(e) => update('nameTo', e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-sm md:col-span-4">
          <span className="font-semibold">Gönderilecek platformlar:</span>
          {PLATFORMS.map((item) => (
            <label key={item.key} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={platforms.includes(item.key)}
                onChange={(e) => setPlatforms((current) => e.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key))}
              />
              {item.label}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-4">
          <button type="button" className="btn btn-secondary" onClick={loadPreview} disabled={busy !== ''}>
            <Eye size={16} /> {busy === 'preview' ? 'Hazırlanıyor...' : 'Önizle'}
          </button>
          <button type="button" className="btn btn-primary" onClick={createAndSend} disabled={!preview || busy !== ''}>
            <Send size={16} /> {busy === 'create' ? 'İşleniyor...' : 'Oluştur ve Gönder'}
          </button>
        </div>
      </div>

      {message && <div className="mt-3 rounded-md border border-line bg-slate-50 p-3 text-sm">{message}</div>}

      {preview && (
        <div className="mt-4 rounded-md border border-line bg-white p-4">
          <div className="mb-3 text-sm">
            <b>Kaynak:</b> {preview.source.productName} — {preview.source.modelCode} · {preview.source.baseSize} cm ·
            Trendyol {money(preview.source.trendyolSalePrice)} · stok {preview.source.stockQuantity} · {preview.source.imageCount} görsel
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-3">Boy</th><th className="pr-3">Model kodu</th><th className="pr-3">Ürün adı</th>
                  <th className="pr-3">Trendyol</th><th className="pr-3">N11</th><th className="pr-3">HB</th><th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((item) => (
                  <tr key={item.size} className="border-b">
                    <td className="py-2 pr-3 font-semibold">{item.size} cm</td>
                    <td className="pr-3">{item.modelCode}</td>
                    <td className="pr-3">{item.productName}</td>
                    <td className="pr-3">{money(item.trendyolSalePrice)}</td>
                    <td className="pr-3">{money(item.n11SalePrice)}</td>
                    <td className="pr-3">{money(item.hepsiburadaSalePrice)}</td>
                    <td>{item.exists ? <span className="text-amber-600">Zaten var (yeniden gönderilir)</span> : <span className="text-emerald-600">Yeni</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {created.length > 0 && (
        <div className="mt-4 rounded-md border border-line bg-white p-4">
          <div className="mb-2 font-bold">Sonuç</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Boy</th><th className="pr-3">Model kodu</th><th className="pr-3">Barkod</th><th>Platformlar</th></tr>
            </thead>
            <tbody>
              {created.map((item) => (
                <tr key={item.variantId} className="border-b align-top">
                  <td className="py-2 pr-3 font-semibold">{item.size} cm</td>
                  <td className="pr-3">{item.modelCode}</td>
                  <td className="pr-3">{item.barcode}</td>
                  <td>
                    {sendResults.filter((row) => row.id === item.variantId).map((row) => (
                      <div key={row.platform} className={row.ok ? 'text-emerald-600' : 'text-red-600'}>
                        {labelOf(row.platform)}: {row.ok ? 'Gönderildi' : row.errorMessage ?? 'Hata'}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
