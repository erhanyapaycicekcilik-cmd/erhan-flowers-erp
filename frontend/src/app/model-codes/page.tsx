'use client';

import { useEffect, useState } from 'react';
import { Copy, PackagePlus, RefreshCw } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import type { Category } from '@/types';

export default function ModelCodesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [modelCode, setModelCode] = useState('');

  useEffect(() => {
    api<Category[]>('/categories').then(setCategories).catch(() => null);
  }, []);

  async function generate() {
    const result = await api<{ modelCode: string }>('/model-codes/generate', {
      method: 'POST',
      json: { categoryId: Number(categoryId) },
    });
    setModelCode(result.modelCode);
  }

  return (
    <AdminShell title="Model Kodu Merkezi">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="panel p-5">
          <div className="mb-5 flex items-center gap-2">
            <PackagePlus size={18} />
            <h2 className="font-bold">ERH Model Kodu Üret</h2>
          </div>
          <label className="block space-y-1.5">
            <span className="label">Kategori</span>
            <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Seçiniz</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary mt-4" onClick={generate} disabled={!categoryId}>
            <RefreshCw size={17} />
            Kod Üret
          </button>
          {modelCode && (
            <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase text-slate-500">Üretilen Kod</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-2xl font-bold">{modelCode}</div>
                <button className="btn btn-secondary min-h-9 px-3" onClick={() => navigator.clipboard.writeText(modelCode)}>
                  <Copy size={15} />
                  Kopyala
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-bold">Kategori Kod Aralıkları</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Örnek</th>
                  <th className="px-5 py-3">Başlangıç</th>
                  <th className="px-5 py-3">Son Kullanılan</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-t border-line">
                    <td className="px-5 py-3 font-semibold">{category.name}</td>
                    <td className="px-5 py-3">{category.codePrefix}-{category.startCode}</td>
                    <td className="px-5 py-3">{category.startCode}</td>
                    <td className="px-5 py-3">{category.currentCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

