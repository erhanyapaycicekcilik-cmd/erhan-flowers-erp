'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Save, XCircle } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import type { Category, Product, Status } from '@/types';

const emptyForm = {
  id: 0,
  productName: '',
  modelCode: '',
  categoryId: '',
  stockQuantity: 0,
  criticalStockLevel: 0,
  status: 'ACTIVE' as Status,
  description: '',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const editing = form.id > 0;

  async function load() {
    const [productData, categoryData] = await Promise.all([
      api<Product[]>('/products'),
      api<Category[]>('/categories'),
    ]);
    setProducts(productData);
    setCategories(categoryData);
  }

  useEffect(() => {
    load().catch(() => null);
  }, []);

  const activeProducts = useMemo(() => products.filter((product) => product.status === 'ACTIVE'), [products]);

  async function generateModelCode() {
    if (!form.categoryId) return;
    const result = await api<{ modelCode: string }>('/model-codes/generate', {
      method: 'POST',
      json: { categoryId: Number(form.categoryId) },
    });
    setForm((current) => ({ ...current, modelCode: result.modelCode }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const payload = {
      productName: form.productName,
      modelCode: form.modelCode,
      categoryId: Number(form.categoryId),
      stockQuantity: Number(form.stockQuantity),
      criticalStockLevel: Number(form.criticalStockLevel),
      status: form.status,
      description: form.description,
    };

    if (editing) {
      await api(`/products/${form.id}`, { method: 'PATCH', json: payload });
      setMessage('Ürün güncellendi.');
    } else {
      await api('/products', { method: 'POST', json: payload });
      setMessage('Ürün eklendi.');
    }
    setForm(emptyForm);
    await load();
  }

  function edit(product: Product) {
    setForm({
      id: product.id,
      productName: product.productName,
      modelCode: product.modelCode,
      categoryId: String(product.categoryId),
      stockQuantity: product.stockQuantity,
      criticalStockLevel: product.criticalStockLevel,
      status: product.status,
      description: product.description ?? '',
    });
  }

  async function makePassive(product: Product) {
    await api(`/products/${product.id}/passive`, { method: 'PATCH' });
    await load();
  }

  return (
    <AdminShell title="Ürün Merkezi">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="panel p-5">
          <div className="mb-5 flex items-center gap-2">
            {editing ? <Edit3 size={18} /> : <Plus size={18} />}
            <h2 className="font-bold">{editing ? 'Ürün Düzenle' : 'Ürün Ekle'}</h2>
          </div>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="label">Ürün Adı</span>
              <input className="field" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} required />
            </label>
            <label className="block space-y-1.5">
              <span className="label">Kategori</span>
              <select className="field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                <option value="">Seçiniz</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="block space-y-1.5">
                <span className="label">Model Kodu</span>
                <input className="field" value={form.modelCode} onChange={(e) => setForm({ ...form, modelCode: e.target.value })} required />
              </label>
              <button type="button" className="btn btn-secondary mt-6" onClick={generateModelCode} disabled={!form.categoryId}>
                Üret
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="label">Stok</span>
                <input className="field" type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })} />
              </label>
              <label className="block space-y-1.5">
                <span className="label">Kritik Limit</span>
                <input className="field" type="number" value={form.criticalStockLevel} onChange={(e) => setForm({ ...form, criticalStockLevel: Number(e.target.value) })} />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="label">Durum</span>
              <select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
                <option value="ACTIVE">Aktif</option>
                <option value="PASSIVE">Pasif</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="label">Açıklama</span>
              <textarea className="field min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
          </div>
          {message && <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
          <div className="mt-5 flex gap-2">
            <button className="btn btn-primary" type="submit"><Save size={17} />Kaydet</button>
            {editing && <button className="btn btn-secondary" type="button" onClick={() => setForm(emptyForm)}>Vazgeç</button>}
          </div>
        </form>

        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-bold">Ürün Listesi</h2>
            <p className="text-sm text-slate-500">{activeProducts.length} aktif ürün</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Ürün</th>
                  <th className="px-5 py-3">Model</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Stok</th>
                  <th className="px-5 py-3">Durum</th>
                  <th className="px-5 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-line">
                    <td className="px-5 py-3 font-semibold">{product.productName}</td>
                    <td className="px-5 py-3">{product.modelCode}</td>
                    <td className="px-5 py-3">{product.category?.name}</td>
                    <td className="px-5 py-3">{product.stockQuantity}</td>
                    <td className="px-5 py-3"><StatusBadge status={product.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="btn btn-secondary min-h-9 px-3" onClick={() => edit(product)}><Edit3 size={15} />Düzenle</button>
                        {product.status === 'ACTIVE' && (
                          <button className="btn btn-danger min-h-9 px-3" onClick={() => makePassive(product)}><XCircle size={15} />Pasif</button>
                        )}
                      </div>
                    </td>
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

