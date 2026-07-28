'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Barcode, Download, RefreshCw } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiBaseUrl } from '@/lib/api';
import type { Product } from '@/types';

export default function BarcodesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [barcode, setBarcode] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    api<Product[]>('/products').then(setProducts).catch(() => null);
  }, []);

  useEffect(() => {
    if (barcode && canvasRef.current) {
      JsBarcode(canvasRef.current, barcode, {
        format: 'CODE128',
        width: 2,
        height: 70,
        displayValue: true,
        fontSize: 16,
      });
    }
  }, [barcode]);

  const selected = products.find((product) => product.id === Number(productId));

  async function generate() {
    const result = await api<{ barcode: string }>('/barcodes/generate', {
      method: 'POST',
      json: { productId: Number(productId) },
    });
    setBarcode(result.barcode);
    setProducts((current) =>
      current.map((product) => (product.id === Number(productId) ? { ...product, barcode: result.barcode } : product)),
    );
  }

  async function downloadPdf() {
    if (!productId) return;
    const response = await fetch(`${apiBaseUrl}/barcodes/${productId}/pdf`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selected?.modelCode ?? 'barcode'}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <AdminShell title="Barkod Merkezi">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="panel p-5">
          <div className="mb-5 flex items-center gap-2">
            <Barcode size={18} />
            <h2 className="font-bold">Ürün Barkodu</h2>
          </div>
          <label className="block space-y-1.5">
            <span className="label">Ürün</span>
            <select
              className="field"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const product = products.find((item) => item.id === Number(e.target.value));
                setBarcode(product?.barcode ?? '');
              }}
            >
              <option value="">Seçiniz</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.productName} - {product.modelCode}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={generate} disabled={!productId}>
              <RefreshCw size={17} />
              Barkod Üret
            </button>
            <button className="btn btn-secondary" onClick={downloadPdf} disabled={!barcode}>
              <Download size={17} />
              PDF
            </button>
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="font-bold">Barkod Görünümü</h2>
          <div className="mt-5 flex min-h-52 items-center justify-center rounded-lg border border-dashed border-line bg-white p-4">
            {barcode ? <canvas ref={canvasRef} /> : <div className="text-sm text-slate-500">Barkod üretmek için ürün seçin.</div>}
          </div>
          {selected && (
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <div><span className="text-slate-500">Ürün:</span> {selected.productName}</div>
              <div><span className="text-slate-500">Model:</span> {selected.modelCode}</div>
              <div><span className="text-slate-500">Barkod:</span> {barcode || 'Henüz yok'}</div>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

