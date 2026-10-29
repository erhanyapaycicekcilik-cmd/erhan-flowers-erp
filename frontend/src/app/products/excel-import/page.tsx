'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiBaseUrl } from '@/lib/api';
import { CheckCircle2, Upload, XCircle } from 'lucide-react';

type PreviewRow = {
  rowIndex: number;
  productName: string;
  barcode: string;
  modelCode: string;
  price: number;
  stock: number;
  imageUrl: string;
};

type Category = { id: number; name: string };

export default function ExcelImportPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [bulkCategory, setBulkCategory] = useState<number | ''>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => null);
  }, []);

  async function handleFile(f: File) {
    setFile(f);
    setResult(null);
    setRows([]);
    setAssignments({});
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch(`${apiBaseUrl}/products/parse-excel-preview`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch {
      alert('Excel okunamadı');
    } finally {
      setLoading(false);
    }
  }

  function applyBulk() {
    if (!bulkCategory) return;
    const map: Record<number, number> = {};
    rows.forEach(r => { map[r.rowIndex] = Number(bulkCategory); });
    setAssignments(map);
  }

  async function handleImport() {
    if (!file) return;
    const assigned = Object.entries(assignments).filter(([, v]) => v > 0);
    if (assigned.length === 0) { alert('En az bir ürüne kategori seçin'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('assignments', JSON.stringify(assigned.map(([k, v]) => ({ rowIndex: Number(k), categoryId: Number(v) }))));
      const res = await fetch(`${apiBaseUrl}/products/import-from-excel-with-categories`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      setResult(await res.json());
      setRows([]);
      setFile(null);
    } catch {
      alert('Aktarım sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  const assignedCount = Object.values(assignments).filter(v => v > 0).length;

  return (
    <AdminShell title="Excel'den Ürün Aktar">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <Upload className="mx-auto mb-3 text-gray-400" size={36} />
          <p className="text-gray-600 font-medium">Excel dosyasını buraya sürükleyin veya tıklayın</p>
          <p className="text-gray-400 text-sm mt-1">.xlsx veya .xls — maksimum 500 satır</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {loading && <p className="text-center text-gray-500">Yükleniyor…</p>}

        {/* Result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex gap-4 items-start">
            <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={22} />
            <div>
              <p className="font-semibold text-green-800">Aktarım tamamlandı</p>
              <p className="text-green-700 text-sm mt-1">
                {result.created} yeni ürün oluşturuldu · {result.updated} güncellendi · {result.skipped} atlandı
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 text-red-600 text-xs space-y-0.5">
                  {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-gray-700 font-medium">{rows.length} ürün bulundu — kategori seçin</p>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-lg px-3 py-1.5 text-sm"
                  value={bulkCategory}
                  onChange={e => setBulkCategory(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Toplu kategori seç…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={applyBulk} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800">
                  Tümüne Uygula
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Ürün Adı</th>
                    <th className="px-4 py-3 text-left">Barkod / Model</th>
                    <th className="px-4 py-3 text-right">Fiyat</th>
                    <th className="px-4 py-3 text-right">Stok</th>
                    <th className="px-4 py-3 text-left w-52">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(row => (
                    <tr key={row.rowIndex} className={assignments[row.rowIndex] ? 'bg-white' : 'bg-amber-50'}>
                      <td className="px-4 py-2.5 max-w-xs truncate font-medium text-gray-800">{row.productName || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {row.barcode && <span className="block">{row.barcode}</span>}
                        {row.modelCode && <span className="block">{row.modelCode}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{row.price > 0 ? `${row.price} ₺` : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{row.stock > 0 ? row.stock : '—'}</td>
                      <td className="px-4 py-2.5">
                        <select
                          className="w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-300"
                          value={assignments[row.rowIndex] ?? ''}
                          onChange={e => setAssignments(prev => ({ ...prev, [row.rowIndex]: Number(e.target.value) }))}
                        >
                          <option value="">— Kategori seç</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {assignedCount} / {rows.length} ürüne kategori atandı
                {rows.length - assignedCount > 0 && (
                  <span className="ml-2 text-amber-600 flex items-center gap-1 inline-flex">
                    <XCircle size={14} /> {rows.length - assignedCount} ürün atlanacak
                  </span>
                )}
              </div>
              <button
                onClick={handleImport}
                disabled={loading || assignedCount === 0}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {loading ? 'Aktarılıyor…' : `${assignedCount} Ürünü Aktar`}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
