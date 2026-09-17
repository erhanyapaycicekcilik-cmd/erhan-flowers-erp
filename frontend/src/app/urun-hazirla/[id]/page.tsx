'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, apiBaseUrl } from '@/lib/api';
import { Camera, CheckCircle2, Package, QrCode, ArrowLeft } from 'lucide-react';

interface Sale {
  id: number;
  saleNumber: string;
  status: string;
  items?: { productName: string }[];
}

type PhotoType = 'BARCODE' | 'PACKAGE';

interface PhotoSlot {
  type: PhotoType;
  label: string;
  hint: string;
  icon: React.ReactNode;
  preview: string | null;
  uploading: boolean;
  done: boolean;
}

export default function UrunHazirlaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [slots, setSlots] = useState<PhotoSlot[]>([
    { type: 'BARCODE', label: 'Barkod Yakın Çekim', hint: 'Barkod net okunabilir olmalı', icon: <QrCode size={28} />, preview: null, uploading: false, done: false },
    { type: 'PACKAGE', label: 'Paketli Ürün (Uzak)', hint: 'Barkod yine görünür olmalı', icon: <Package size={28} />, preview: null, uploading: false, done: false },
  ]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    void api<Sale>(`/sales/${id}`).then(setSale).catch(() => null);
  }, [id]);

  function updateSlot(type: PhotoType, patch: Partial<PhotoSlot>) {
    setSlots(prev => prev.map(s => s.type === type ? { ...s, ...patch } : s));
  }

  async function onFileChange(type: PhotoType, file: File) {
    const reader = new FileReader();
    reader.onload = e => updateSlot(type, { preview: e.target?.result as string });
    reader.readAsDataURL(file);

    updateSlot(type, { uploading: true });
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${apiBaseUrl}/sales/${id}/proof-photo?photoType=${type}`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Yükleme başarısız');
      const data = (await res.json()) as { readyTriggered?: boolean };
      updateSlot(type, { done: true, uploading: false });
      if (data.readyTriggered) {
        setSuccess(true);
        setTimeout(() => router.push('/orders'), 2000);
      }
    } catch {
      updateSlot(type, { uploading: false });
      setError('Fotoğraf yüklenemedi, tekrar dene.');
    }
  }

  const allDone = slots.every(s => s.done);

  return (
    <main className="min-h-screen bg-slate-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Ürün Hazır Fotoğrafları</h1>
          {sale && <p className="text-xs text-slate-500">Sipariş #{sale.saleNumber}</p>}
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 size={56} className="text-green-500" />
          <div className="text-xl font-bold text-green-700">Ürün Kargoya Hazır!</div>
          <p className="text-sm text-slate-500">Siparişler sayfasına yönlendiriliyorsunuz...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            İki fotoğraf da yüklenince sipariş otomatik olarak <strong>Kargoya Hazır</strong> durumuna geçer.
          </p>

          {slots.map((slot, i) => (
            <div key={slot.type} className={`panel p-4 space-y-3 ${slot.done ? 'border-green-300 bg-green-50' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={slot.done ? 'text-green-600' : 'text-slate-400'}>{slot.icon}</span>
                <div>
                  <div className="font-semibold text-sm">{i + 1}. {slot.label}</div>
                  <div className="text-xs text-slate-400">{slot.hint}</div>
                </div>
                {slot.done && <CheckCircle2 size={18} className="text-green-500 ml-auto" />}
              </div>

              {slot.preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.preview} alt={slot.label} className="w-full rounded-lg object-cover max-h-52" />
              )}

              <input
                ref={el => { inputRefs.current[i] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void onFileChange(slot.type, f); }}
              />

              <button
                disabled={slot.uploading || slot.done}
                onClick={() => inputRefs.current[i]?.click()}
                className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition
                  ${slot.done ? 'bg-green-100 text-green-700 cursor-default' : 'bg-brand text-white active:opacity-80'}`}
              >
                <Camera size={16} />
                {slot.uploading ? 'Yükleniyor...' : slot.done ? 'Yüklendi ✓' : 'Fotoğraf Çek / Seç'}
              </button>
            </div>
          ))}

          {allDone && !success && (
            <div className="text-center text-sm text-slate-500 py-2">Her iki fotoğraf yüklendi, durum güncelleniyor...</div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          )}
        </div>
      )}
    </main>
  );
}
