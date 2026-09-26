'use client';

import { useState, useRef, useCallback } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Upload, CheckCircle2, XCircle, ImageIcon } from 'lucide-react';

interface UploadResult {
  matched: number;
  unmatched: number;
  matchedFiles: string[];
  unmatchedFiles: string[];
}

export default function BulkUploadImagesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const jpgs = Array.from(incoming).filter(f => /\.(jpe?g|png|webp)$/i.test(f.name));
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...jpgs.filter(f => !names.has(f.name))];
    });
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  async function upload() {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const token = localStorage.getItem('auth_token_erp.florayapaycicek.com_default') ?? '';
      const BATCH = 50;
      let totalMatched = 0, totalUnmatched = 0;
      const allMatched: string[] = [], allUnmatched: string[] = [];

      for (let i = 0; i < files.length; i += BATCH) {
        const batch = files.slice(i, i + BATCH);
        const fd = new FormData();
        batch.forEach(f => fd.append('files', f));
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.florayapaycicek.com'}/stock-cards/bulk-upload-images`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) throw new Error(await res.text());
        const data: UploadResult = await res.json();
        totalMatched += data.matched;
        totalUnmatched += data.unmatched;
        allMatched.push(...data.matchedFiles);
        allUnmatched.push(...data.unmatchedFiles);
      }

      setResult({ matched: totalMatched, unmatched: totalUnmatched, matchedFiles: allMatched, unmatchedFiles: allUnmatched });
      setFiles([]);
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminShell>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-2">Toplu Görsel Yükleme</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Dosya adı (uzantısız) stok kartının SKU, barkod veya model kodu ile eşleşen görseller otomatik atanır.
          <br />Örnek: <code className="bg-gray-100 px-1 rounded">DMT-0023.jpg</code> → model kodu DMT-0023 olan stok kartına
        </p>

        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mx-auto mb-3 text-gray-400" size={40} />
          <p className="font-medium text-gray-700">Görselleri buraya sürükleyin veya tıklayın</p>
          <p className="text-sm text-gray-400 mt-1">JPG, PNG, WebP — birden fazla seçebilirsiniz</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700 flex items-center gap-2">
                <ImageIcon size={16} /> {files.length} görsel seçildi
              </span>
              <button onClick={() => setFiles([])} className="text-sm text-red-500 hover:underline">Temizle</button>
            </div>
            <div className="max-h-40 overflow-y-auto text-xs text-gray-500 space-y-0.5">
              {files.map(f => <div key={f.name}>{f.name}</div>)}
            </div>
          </div>
        )}

        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <button
          onClick={upload}
          disabled={!files.length || uploading}
          className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Yükleniyor…' : `${files.length} Görseli Yükle`}
        </button>

        {result && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <CheckCircle2 className="mx-auto mb-1 text-green-500" size={28} />
                <div className="text-2xl font-bold text-green-700">{result.matched}</div>
                <div className="text-sm text-green-600">Eşleşti &amp; yüklendi</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <XCircle className="mx-auto mb-1 text-red-400" size={28} />
                <div className="text-2xl font-bold text-red-600">{result.unmatched}</div>
                <div className="text-sm text-red-500">Eşleşmedi</div>
              </div>
            </div>

            {result.unmatchedFiles.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700 mb-2 text-sm">Eşleşmeyen dosyalar:</p>
                <div className="max-h-48 overflow-y-auto text-xs text-gray-500 space-y-0.5">
                  {result.unmatchedFiles.map(f => <div key={f}>{f}</div>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
