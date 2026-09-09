'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Upload, AlertCircle, Clock, CopyCheck } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.florayapaycicek.com';

type EftRequest = {
  id: number;
  token: string;
  status: string;
  originalAmount: number;
  discountRate: number;
  discountAmount: number;
  finalAmount: number;
  bankName: string;
  iban: string;
  accountHolder: string;
  dekontPath?: string | null;
  dekontUploadedAt?: string | null;
  saleNumber: string;
  customerName: string;
  expiresAt: string;
};

function money(v: number) {
  return `${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function copyToClipboard(text: string, onCopy: () => void) {
  navigator.clipboard.writeText(text).then(onCopy).catch(() => {});
}

export default function EftPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<EftRequest | null>(null);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/eft-public/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.message ?? 'Hata')))
      .then(setData)
      .catch(e => setError(String(e)));
  }, [token]);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (note) form.append('customerNote', note);
      const res = await fetch(`${API}/eft-public/${token}/dekont`, { method: 'POST', body: form });
      const json = await res.json() as { ok: boolean; message: string };
      if (!json.ok) throw new Error(json.message);
      setUploaded(true);
      setData(d => d ? { ...d, dekontUploadedAt: new Date().toISOString() } : d);
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  }

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h1 className="text-xl font-bold text-red-700">Hata</h1>
        <p className="mt-2 text-slate-600">{error}</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );

  const alreadyUploaded = Boolean(data.dekontUploadedAt) || uploaded;
  const isConfirmed = data.status === 'CONFIRMED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 p-4">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow-sm text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-2xl">🌿</span>
          </div>
          <h1 className="text-xl font-black text-slate-800">EFT ile Ödeme</h1>
          <p className="text-sm text-slate-500">Erhan Yapaycicekcilik</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700">
            %{(data.discountRate * 100).toFixed(0)} EFT İndirimi Uygulandı!
          </div>
        </div>

        {isConfirmed && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={40} />
            <h2 className="text-lg font-bold text-emerald-800">Ödemeniz Onaylandı!</h2>
            <p className="mt-1 text-sm text-emerald-700">Siparişiniz hazırlanmaya başlandı. Teşekkürler!</p>
          </div>
        )}

        {/* Sipariş özeti */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-700">Sipariş Özeti</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Sipariş No</span>
              <span className="font-semibold">{data.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Müşteri</span>
              <span className="font-semibold">{data.customerName}</span>
            </div>
            <hr className="border-slate-100" />
            <div className="flex justify-between text-slate-400 line-through">
              <span>Normal Tutar</span>
              <span>{money(data.originalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>EFT İndirimi (%{(data.discountRate * 100).toFixed(0)})</span>
              <span>- {money(data.discountAmount)}</span>
            </div>
            <hr className="border-slate-100" />
            <div className="flex justify-between text-lg font-black text-slate-800">
              <span>Ödenecek Tutar</span>
              <span className="text-emerald-700">{money(data.finalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Banka bilgileri */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-700">Havale / EFT Bilgileri</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400 mb-0.5">Banka</p>
              <p className="font-semibold text-slate-800">{data.bankName}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400 mb-0.5">Hesap Sahibi</p>
              <p className="font-semibold text-slate-800">{data.accountHolder}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs text-emerald-600 mb-0.5">IBAN</p>
              <p className="font-mono font-bold text-emerald-800 text-base tracking-wide">{data.iban}</p>
              <button
                type="button"
                onClick={() => copyToClipboard(data.iban.replace(/\s/g, ''), () => { setCopiedIban(true); setTimeout(() => setCopiedIban(false), 2000); })}
                className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
              >
                <CopyCheck size={13} />
                {copiedIban ? 'Kopyalandı!' : 'IBAN Kopyala'}
              </button>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
              ⚠️ Açıklama kısmına <b>{data.saleNumber}</b> sipariş numaranızı yazmayı unutmayın.
            </div>
          </div>
        </div>

        {/* Dekont yükleme */}
        {!isConfirmed && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-bold text-slate-700">Dekont Yükleme</h2>
            <p className="mb-3 text-xs text-slate-500">EFT/havaleyi yaptıktan sonra dekontu yükleyin, siparişiniz hemen hazırlanmaya başlasın.</p>

            {alreadyUploaded ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <CheckCircle2 className="shrink-0 text-emerald-600" size={24} />
                <div>
                  <p className="font-semibold text-emerald-800">Dekontunuz alındı!</p>
                  <p className="text-xs text-emerald-600">En kısa sürede incelenerek siparişiniz onaylanacak.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center hover:border-emerald-400 hover:bg-emerald-50 transition"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mb-2 text-slate-400" size={28} />
                  {file ? (
                    <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-600">Dekont Seç</p>
                      <p className="text-xs text-slate-400">JPG, PNG veya PDF (maks 10MB)</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <textarea
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-400 focus:outline-none resize-none"
                  rows={2}
                  placeholder="Notunuz (isteğe bağlı)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />

                <button
                  type="button"
                  disabled={!file || uploading}
                  onClick={handleUpload}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {uploading ? 'Yükleniyor...' : 'Dekontu Gönder'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Son geçerlilik */}
        <div className="flex items-center gap-2 justify-center text-xs text-slate-400 pb-4">
          <Clock size={12} />
          Bu link {new Date(data.expiresAt).toLocaleDateString('tr-TR')} tarihine kadar geçerlidir.
        </div>
      </div>
    </div>
  );
}
