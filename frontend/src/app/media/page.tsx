'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ImagePlus, Upload, Wand2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, uploadUrl } from '@/lib/api';
import type { MediaFile, Product } from '@/types';

export default function MediaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [productId, setProductId] = useState('');
  const [folderName, setFolderName] = useState('Genel');
  const [file, setFile] = useState<File | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    const [productData, mediaData] = await Promise.all([
      api<Product[]>('/products'),
      api<MediaFile[]>('/media'),
    ]);
    setProducts(productData);
    setMedia(mediaData);
  }

  useEffect(() => {
    load().catch(() => null);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderName', folderName);
    if (productId) formData.append('productId', productId);

    await api('/media/upload', { method: 'POST', body: formData });
    setFile(null);
    setMessage('Görsel yüklendi.');
    await load();
  }

  async function processWithPhotoroom(id: number) {
    setProcessingId(id);
    setMessage('');

    try {
      await api(`/media/${id}/photoroom`, { method: 'POST' });
      setMessage('Photoroom işlemi tamamlandı. Yeni görsel listeye eklendi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Photoroom işlemi tamamlanamadı.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <AdminShell title="Medya Merkezi">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="panel p-5">
          <div className="mb-5 flex items-center gap-2">
            <ImagePlus size={18} />
            <h2 className="font-bold">Ürün Görseli Yükle</h2>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="label">Ürün</span>
              <select className="field" value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Ürünsüz yükle</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productName} - {product.modelCode}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="label">Klasör</span>
              <input className="field" value={folderName} onChange={(event) => setFolderName(event.target.value)} />
            </label>

            <label className="block space-y-1.5">
              <span className="label">Dosya</span>
              <input className="field" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>

          <button className="btn btn-primary mt-5" disabled={!file}>
            <Upload size={17} />
            Yükle
          </button>

          {message && <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div>}
        </form>

        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-bold">Yüklenen Görseller</h2>
            <p className="mt-1 text-sm text-slate-500">Photoroom işlemi sadece butona basıldığında çalışır.</p>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {media.map((item) => (
              <article key={item.id} className="rounded-lg border border-line bg-white p-3">
                <img src={`${uploadUrl}${item.filePath}`} alt={item.fileName} className="h-40 w-full rounded-md object-cover" />
                <div className="mt-3 text-sm font-semibold">{item.fileName}</div>
                <div className="text-xs text-slate-500">{item.folderName}</div>
                <div className="mt-1 text-xs text-slate-500">{item.product?.productName ?? 'Ürün eşleşmesi yok'}</div>

                <button
                  className="btn btn-secondary mt-3 w-full min-h-9 px-3"
                  onClick={() => processWithPhotoroom(item.id)}
                  disabled={processingId === item.id || !item.fileType.startsWith('image/')}
                  title="Photoroom ile arka plan temizle"
                >
                  <Wand2 size={15} />
                  {processingId === item.id ? 'İşleniyor...' : 'Arka Planı Temizle'}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

