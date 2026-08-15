'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, FileSpreadsheet, RefreshCw, Send, TestTube2, XCircle } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type PublishProduct = {
  id: number;
  barcode: string;
  productName: string;
  modelCode: string | null;
  category: string | null;
  familyName: string | null;
  salePrice: number;
  stockQuantity: number;
  seoApprovalStatus: string;
  trendyolProductUrl: string | null;
  imageCount: number;
  ready: boolean;
  missingFields: string[];
};

type PublishHistory = {
  id: number;
  actionType: 'PREVIEW' | 'TEST_UPDATE' | 'LIVE_SEND';
  status: 'PENDING' | 'READY' | 'SUCCESS' | 'FAILED' | 'BLOCKED';
  missingFields: string[];
  errorMessage: string | null;
  createdAt: string;
  variant: { barcode: string; productName: string; currentModelCode: string | null };
  createdBy: { name: string; email: string };
};

type PreviewData = {
  ready: boolean;
  missingFields: string[];
  payload: Record<string, unknown>;
};

type ExcelExportResult = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  total: number;
  missingByProduct: Array<{ id: number; productName: string; missingFields: string[] }>;
};

const actionLabels = {
  PREVIEW: 'Ön izleme',
  TEST_UPDATE: 'Test güncellemesi',
  LIVE_SEND: 'Trendyol’a gönder',
};

const statusLabels = {
  PENDING: 'Bekliyor',
  READY: 'Hazır',
  SUCCESS: 'Başarılı',
  FAILED: 'Hatalı',
  BLOCKED: 'Eksik alan',
};

const platformOptions = [
  { value: 'TRENDYOL', label: 'Trendyol' },
  { value: 'HEPSIBURADA', label: 'Hepsiburada' },
  { value: 'N11', label: 'N11' },
  { value: 'TICIMAX', label: 'Ticimax' },
];

export default function PublishingPage() {
  const [products, setProducts] = useState<PublishProduct[]>([]);
  const [history, setHistory] = useState<PublishHistory[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [onlyReady, setOnlyReady] = useState(false);
  const [excelPlatform, setExcelPlatform] = useState('TRENDYOL');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    const [productData, historyData] = await Promise.all([
      api<PublishProduct[]>('/publishing/products'),
      api<PublishHistory[]>('/publishing/history'),
    ]);
    setProducts(productData);
    setHistory(historyData);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const visibleProducts = useMemo(() => {
    const needle = normalize(search);
    return products.filter((item) => {
      const text = normalize(`${item.barcode} ${item.productName} ${item.modelCode ?? ''} ${item.category ?? ''}`);
      return (!onlyReady || item.ready) && (!needle || text.includes(needle));
    });
  }, [products, search, onlyReady]);

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function selectVisible() {
    setSelected(visibleProducts.map((item) => item.id));
  }

  function selectReadyVisible() {
    setSelected(visibleProducts.filter((item) => item.ready).map((item) => item.id));
  }

  async function createPreview(id: number) {
    const data = await api<PreviewData>(`/publishing/products/${id}/preview`);
    setPreview(data);
    setMessage(data.ready ? 'Ürün Trendyol gönderimi için hazır.' : 'Eksik alanlar var. Önce bu alanları tamamlayın.');
    await load();
  }

  async function testUpdate(id: number) {
    const result = await api<any>(`/publishing/products/${id}/test-update`, { method: 'POST' });
    setMessage(result.ok ? 'Test güncellemesi başarılı.' : result.errorMessage ?? 'Test güncellemesi yapılamadı.');
    await load();
  }

  async function sendSelected() {
    const result = await api<any>('/publishing/send', { method: 'POST', json: { variantIds: selected, platforms: [excelPlatform] } });
    setMessage(`Gönderim tamamlandı. Başarılı: ${result.success}, Hatalı: ${result.failed}`);
    await load();
  }

  async function exportExcel(ids: number[], label: string) {
    const variantIds = Array.from(new Set(ids.filter(Boolean)));
    if (!variantIds.length) {
      setMessage('Excel için önce ürün seçin veya listede ürün bırakacak bir filtre uygulayın.');
      return;
    }
    const result = await api<ExcelExportResult>('/publishing/excel-export', {
      method: 'POST',
      json: { variantIds, platform: excelPlatform },
    });
    downloadBase64File(result);
    const blocked = result.missingByProduct.filter((item) => item.missingFields.length > 0).length;
    setMessage(`${label} Excel hazırlandı. Ürün: ${result.total}, eksik alan uyarısı olan: ${blocked}.`);
    await load();
  }

  return (
    <AdminShell title="Yayınlama Merkezi">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Yayınlama Merkezi</h2>
          <p className="text-sm text-slate-500">ERP’de hazırlanan ürünleri kontrol et, ön izle, test et ve yönetici onayıyla Trendyol’a gönder.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>
          <RefreshCw size={17} />
          Yenile
        </button>
      </div>

      {message && <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <SummaryCard label="Toplam ürün" value={products.length} />
        <SummaryCard label="Hazır ürün" value={products.filter((item) => item.ready).length} />
        <SummaryCard label="Eksik ürün" value={products.filter((item) => !item.ready).length} />
        <SummaryCard label="Seçili ürün" value={selected.length} />
      </section>

      <section className="panel mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <input className="field" placeholder="Barkod, ürün adı, model veya kategori ara" value={search} onChange={(event) => setSearch(event.target.value)} />
          <label className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold">
            <input type="checkbox" checked={onlyReady} onChange={(event) => setOnlyReady(event.target.checked)} />
            Sadece hazır ürünler
          </label>
          <select className="field min-w-44" value={excelPlatform} onChange={(event) => setExcelPlatform(event.target.value)}>
            {platformOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={sendSelected} disabled={selected.length === 0}>
            <Send size={17} />
            Entegrasyonla Gönder
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-secondary" type="button" onClick={selectVisible} disabled={!visibleProducts.length}>
            <CheckCircle2 size={16} />
            Listedekileri Seç
          </button>
          <button className="btn btn-secondary" type="button" onClick={selectReadyVisible} disabled={!visibleProducts.some((item) => item.ready)}>
            <CheckCircle2 size={16} />
            Hazırları Seç
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => exportExcel(selected, 'Seçili ürünler')} disabled={!selected.length}>
            <FileSpreadsheet size={16} />
            Seçili Excel
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => exportExcel(visibleProducts.map((item) => item.id), 'Listedeki ürünler')} disabled={!visibleProducts.length}>
            <Download size={16} />
            Liste Excel
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => exportExcel(visibleProducts.filter((item) => item.ready).map((item) => item.id), 'Hazır ürünler')} disabled={!visibleProducts.some((item) => item.ready)}>
            <Download size={16} />
            Hazır Excel
          </button>
        </div>
      </section>

      <section className="panel mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Seç</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Barkod</th>
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Fiyat</th>
                <th className="px-4 py-3">Stok</th>
                <th className="px-4 py-3">Eksik Alanlar</th>
                <th className="px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((item) => (
                <tr key={item.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <button className="btn btn-secondary min-h-9 px-3" onClick={() => toggle(item.id)}>
                      {selected.includes(item.id) ? 'Seçili' : 'Seç'}
                    </button>
                  </td>
                  <td className="px-4 py-3">{item.ready ? <ReadyBadge /> : <MissingBadge />}</td>
                  <td className="px-4 py-3">{item.barcode}</td>
                  <td className="px-4 py-3 font-semibold">{item.productName}</td>
                  <td className="px-4 py-3">{item.modelCode ?? '-'}</td>
                  <td className="px-4 py-3">{item.category ?? '-'}</td>
                  <td className="px-4 py-3">{Number(item.salePrice || 0).toLocaleString('tr-TR')} TL</td>
                  <td className="px-4 py-3">{item.stockQuantity}</td>
                  <td className="px-4 py-3">
                    {item.missingFields.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.missingFields.map((field) => <span key={field} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{field}</span>)}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-secondary min-h-9 px-3" onClick={() => createPreview(item.id)}>
                        <Eye size={15} />
                        Ön İzleme
                      </button>
                      <button className="btn btn-secondary min-h-9 px-3" onClick={() => testUpdate(item.id)}>
                        <TestTube2 size={15} />
                        Test Güncellemesi
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {preview && (
        <section className="panel mb-6 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold">Ön İzleme</h3>
            {preview.ready ? <ReadyBadge /> : <MissingBadge />}
          </div>
          {preview.missingFields.length > 0 && (
            <div className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Eksik alanlar: {preview.missingFields.join(', ')}
            </div>
          )}
          <pre className="max-h-96 overflow-auto rounded-md bg-slate-50 p-3 text-xs">{JSON.stringify(preview.payload, null, 2)}</pre>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-bold">Güncelleme Geçmişi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">İşlem</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3">Eksik/Hata</th>
                <th className="px-4 py-3">Kullanıcı</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3">{actionLabels[item.actionType]}</td>
                  <td className="px-4 py-3">{statusLabels[item.status]}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{item.variant.productName}</div>
                    <div className="text-xs text-slate-500">{item.variant.barcode} · {item.variant.currentModelCode ?? '-'}</div>
                  </td>
                  <td className="px-4 py-3">{item.errorMessage ?? item.missingFields.join(', ') ?? '-'}</td>
                  <td className="px-4 py-3">{item.createdBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="panel p-4"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}

function ReadyBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> Hazır</span>;
}

function MissingBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><XCircle size={14} /> Eksik</span>;
}

function downloadBase64File(result: ExcelExportResult) {
  const binary = atob(result.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: result.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = result.fileName || `urunler-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}
