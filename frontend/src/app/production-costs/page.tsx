'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, ImageIcon, Search, Upload } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';

type Variant = {
  id: number;
  barcode: string;
  productName: string;
  currentModelCode: string | null;
  proposedModelCode: string | null;
  supplierStockCode: string | null;
  trendyolCategoryName: string | null;
  images: string[] | null;
  detectedSize: string | null;
  costStatus: string;
  lastCalculatedCost?: number;
  productCostStatus?: string;
  trendyolSalePrice?: number | string | null;
  trendyolProductUrl?: string | null;
};

type ImportPreview = {
  totalRows: number;
  newRows: number;
  updateRows: number;
  skippedRows: number;
  errorRows: number;
  rows: Array<{ rowNumber: number; status: string; data: { barcode: string; productName: string; oldModelCode: string }; errors: string[] }>;
};

export default function ProductCostListPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState('');
  const [loadingImport, setLoadingImport] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  function loadProducts() {
    api<Variant[]>('/production-costs/variants').then(setVariants).catch(() => setVariants([]));
    api<{ completed: number; total: number }>('/production-costs/progress').then(setProgress).catch(() => setProgress(null));
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return variants.filter((item) => {
      const status = item.productCostStatus || item.costStatus || 'Maliyet Girilmedi';
      const statusOk = statusFilter === 'Tümü' || status === statusFilter;
      const queryOk = !needle || [item.productName, item.barcode, item.currentModelCode, item.proposedModelCode, item.supplierStockCode]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('tr-TR').includes(needle));
      return statusOk && queryOk;
    });
  }, [query, statusFilter, variants]);

  async function previewExcel(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setPreview(null);
    setMessage('');
    if (!selectedFile) return;
    setLoadingImport(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const result = await api<ImportPreview>('/production-costs/trendyol-import/preview', { method: 'POST', body: formData });
      setPreview(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Excel ön izlemesi alınamadı.');
    } finally {
      setLoadingImport(false);
    }
  }

  async function applyExcel() {
    if (!file) return;
    setLoadingImport(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await api<{ added: number; updated: number; errorRows: number; skippedRows: number }>('/production-costs/trendyol-import/apply', { method: 'POST', body: formData });
      setMessage(`İçe aktarma tamamlandı. Yeni: ${result.added}, güncellenen: ${result.updated}, hatalı: ${result.errorRows}, atlanan: ${result.skippedRows}`);
      setPreview(null);
      setFile(null);
      loadProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Excel içe aktarılamadı.');
    } finally {
      setLoadingImport(false);
    }
  }

  return (
    <AdminShell title="Ürün Maliyet Merkezi">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="panel p-5">
          <h2 className="text-xl font-bold">Ürün Listesi</h2>
          <p className="mt-1 text-sm text-slate-500">Ürün kartına, adına veya görseline tıklayınca maliyet detay ekranı açılır.</p>
          {progress && <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Tamamlanan: {progress.completed} / {progress.total}</div>}
          <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2">
            <Search size={18} className="text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün adı, barkod, eski model kodu veya yeni model kodu ara"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-500">Maliyet durumu</label>
            <select className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>Tümü</option>
              <option>Maliyet Girilmedi</option>
              <option>Taslak</option>
              <option>Kontrol Edilecek</option>
              <option>Tamamlandı</option>
            </select>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-brand">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="font-bold">Trendyol Excel İçe Aktar</h2>
              <p className="mt-1 text-sm text-slate-500">Barkoda göre önce ön izleme yapılır, onaylamadan veritabanına yazılmaz.</p>
            </div>
          </div>
          <label className="btn btn-secondary mt-4 w-full justify-center">
            <Upload size={16} />
            Excel Seç ve Ön İzle
            <input className="hidden" type="file" accept=".xlsx,.xls" onChange={previewExcel} />
          </label>
          {loadingImport && <div className="mt-3 text-sm font-semibold text-slate-500">İşleniyor...</div>}
          {preview && (
            <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Info label="Toplam" value={preview.totalRows} />
                <Info label="Yeni ürün" value={preview.newRows} />
                <Info label="Güncellenecek" value={preview.updateRows} />
                <Info label="Hatalı" value={preview.errorRows} />
              </div>
              <button className="btn btn-primary mt-3 w-full justify-center" onClick={applyExcel}>Onayla ve İçe Aktar</button>
            </div>
          )}
          {message && <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{message}</div>}
        </section>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>{filtered.length} ürün gösteriliyor</span>
        <span>Kartın tamamı tıklanabilir</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((variant) => (
          <div key={variant.id} className="panel overflow-hidden transition hover:border-brand hover:shadow-sm">
            <Link href={`/production-costs/products/${variant.id}`} className="block">
              <ProductImage images={variant.images} />
              <div className="space-y-3 p-4 pb-0">
                <div>
                  <h3 className="line-clamp-2 min-h-10 font-bold text-ink">{variant.productName}</h3>
                  <p className="mt-1 text-xs text-slate-500">Barkod: {variant.barcode}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info label="Yeni model" value={variant.proposedModelCode || '-'} />
                  <Info label="Eski model" value={variant.currentModelCode || variant.supplierStockCode || '-'} />
                  <Info label="Boy" value={variant.detectedSize || '-'} />
                  <Info label="Kategori" value={variant.trendyolCategoryName || '-'} />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                  <Info label="Satış fiyatı" value={money(Number(variant.trendyolSalePrice || 0))} />
                  <span className="text-sm font-bold text-brand">{money(variant.lastCalculatedCost || 0)}</span>
                </div>
              </div>
            </Link>
            <div className="flex items-center justify-between gap-2 p-4 pt-3">
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">{variant.productCostStatus || variant.costStatus || 'Maliyet Girilmedi'}</span>
              {variant.trendyolProductUrl && (
                <a
                  href={variant.trendyolProductUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  Trendyol'da Gör
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

function ProductImage({ images }: { images: string[] | null }) {
  const src = images?.[0];
  if (!src) {
    return <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 text-slate-400"><ImageIcon size={30} /></div>;
  }
  return <img className="aspect-[4/3] w-full object-cover" src={normalizeImage(src)} alt="Ürün görseli" />;
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-0.5 line-clamp-2 font-semibold text-slate-700">{value}</div>
    </div>
  );
}

function normalizeImage(path: string) {
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return apiFileUrl(path);
  return path;
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}
