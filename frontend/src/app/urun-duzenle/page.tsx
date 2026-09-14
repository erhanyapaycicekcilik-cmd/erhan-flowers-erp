'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import { Check, ChevronDown, ChevronUp, Edit3, Image, Loader2, Search, Sparkles, Trash2, Upload, X } from 'lucide-react';

type Category = {
  id: number;
  name: string;
  codePrefix: string;
};

type Product = {
  id: number;
  productName: string;
  modelCode: string;
  barcode: string | null;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  status: string;
  imageUrls: string[];
};

type EditState = {
  productName: string;
  description: string;
  categoryId: number | null;
  imageUrls: string[];
};

type AiForm = {
  productHeight: string;
  potType: string;
  potSize: string;
  fillerMaterial: string;
  stemCount: string;
  leafCount: string;
  comesInTwoParts: boolean;
  comesWith: string;
  cleaningTip: string;
  extraNotes: string;
};

const emptyAiForm = (): AiForm => ({
  productHeight: '',
  potType: '',
  potSize: '',
  fillerMaterial: '',
  stemCount: '',
  leafCount: '',
  comesInTwoParts: false,
  comesWith: '',
  cleaningTip: '',
  extraNotes: '',
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function imgSrc(url: string) {
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function UrunDuzenlePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ productName: '', description: '', categoryId: null, imageUrls: [] });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  // AI bölümü — düzenleme paneli içinde
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState<AiForm>(emptyAiForm());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ productName: string; description: string; hashtags: string[] } | null>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api('/products?limit=500') as Promise<any>,
      api('/categories') as Promise<Category[]>,
    ]).then(([prodData, catData]) => {
      const raw: Product[] = Array.isArray(prodData)
        ? prodData
        : Array.isArray(prodData?.items)
        ? prodData.items
        : [];
      setProducts(raw.filter(p => p.status === 'ACTIVE'));
      setCategories(catData);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = products.filter(p =>
    [p.productName, p.modelCode, p.barcode, p.categoryName]
      .filter(Boolean).join(' ')
      .toLocaleLowerCase('tr-TR')
      .includes(search.toLocaleLowerCase('tr-TR'))
  );

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    const urls = Array.isArray(p.imageUrls) ? p.imageUrls : [];
    setEditState({ productName: p.productName, description: p.description ?? '', categoryId: p.categoryId, imageUrls: urls });
    setCatOpen(false);
    setAiOpen(false);
    setAiForm(emptyAiForm());
    setAiResult(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCatOpen(false);
    setAiOpen(false);
    setAiResult(null);
  };

  const uploadPhoto = async (p: Product, file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('productId', String(p.id));
      const res = await fetch(`${API_BASE}/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : ''}` },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const newUrl: string = data.filePath ?? data.url ?? '';
      if (newUrl) setEditState(s => ({ ...s, imageUrls: [...s.imageUrls, newUrl] }));
    } catch {
      alert('Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setEditState(s => ({ ...s, imageUrls: s.imageUrls.filter(u => u !== url) }));
  };

  const generateAi = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await api('/products/gemini-seo', {
        method: 'POST',
        body: JSON.stringify({ productName: editState.productName, ...aiForm }),
      }) as { productName: string; description: string; hashtags?: string[] };
      setAiResult({ productName: result.productName, description: result.description, hashtags: result.hashtags ?? [] });
    } catch {
      alert('Gemini içerik üretimi başarısız. Backend loglarını kontrol edin.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    const hashtagLine = aiResult.hashtags.length ? '\n\n' + aiResult.hashtags.join(' ') : '';
    setEditState(s => ({ ...s, productName: aiResult.productName, description: aiResult.description + hashtagLine }));
    setAiOpen(false);
    setAiResult(null);
  };

  const save = async (p: Product) => {
    if (!editState.productName.trim()) return;
    setSaving(true);
    try {
      const updated = await api(`/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          productName: editState.productName,
          description: editState.description || null,
          categoryId: editState.categoryId,
          imageUrls: editState.imageUrls,
        }),
      }) as Product;
      setProducts(prev => prev.map(x => x.id === p.id ? {
        ...x,
        productName: updated.productName ?? editState.productName,
        description: updated.description ?? editState.description,
        categoryId: editState.categoryId,
        categoryName: categories.find(c => c.id === editState.categoryId)?.name ?? x.categoryName,
        imageUrls: editState.imageUrls,
      } : x));
      setSavedId(p.id);
      setTimeout(() => setSavedId(null), 2000);
      setEditingId(null);
    } catch {
      alert('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const selectedCatName = categories.find(c => c.id === editState.categoryId)?.name ?? 'Kategori seçin';

  return (
    <AdminShell title="Ürün Düzenle">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ürün Düzenle</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Satışta olan ürünler — ad, açıklama, kategori ve fotoğraf değiştirin</p>
          </div>
        </div>

        {/* Arama */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ürün adı, barkod veya model kodu ara…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor…
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              {filtered.length} ürün
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(p => (
                <div key={p.id} className="px-4 py-3">
                  {editingId === p.id ? (
                    /* Düzenleme modu */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Ürün Adı */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ürün Adı</label>
                          <input
                            type="text"
                            value={editState.productName}
                            onChange={e => setEditState(s => ({ ...s, productName: e.target.value }))}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Kategori */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kategori</label>
                          <div className="relative" ref={catRef}>
                            <button
                              type="button"
                              onClick={() => setCatOpen(o => !o)}
                              className="w-full flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <span className={editState.categoryId ? '' : 'text-gray-400'}>{selectedCatName}</span>
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            </button>
                            {catOpen && (
                              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                {categories.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => { setEditState(s => ({ ...s, categoryId: c.id })); setCatOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-between ${editState.categoryId === c.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                                  >
                                    {c.name}
                                    {editState.categoryId === c.id && <Check className="w-4 h-4" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Açıklama */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Açıklama</label>
                        <textarea
                          rows={7}
                          value={editState.description}
                          onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                          placeholder="Ürün açıklaması…"
                        />
                      </div>

                      {/* ✦ AI Açıklama Asistanı — genişleyen bölüm */}
                      <div className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { setAiOpen(o => !o); setAiResult(null); }}
                          className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
                            <Sparkles className="w-4 h-4" /> AI ile Açıklama &amp; Ürün Adı Üret
                          </span>
                          {aiOpen ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                        </button>

                        {aiOpen && (
                          <div className="px-4 pb-4 pt-3 space-y-3 bg-white dark:bg-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Alanları doldurun → Üret → Sonucu Uygula ile ürün adı ve açıklama otomatik değişir.</p>
                            <div className="grid grid-cols-2 gap-3">
                              {([
                                ['productHeight', 'Boy', '180 cm'],
                                ['potType', 'Saksı tipi', 'Kare Saksı'],
                                ['potSize', 'Saksı ölçüsü', '28x28 cm'],
                                ['fillerMaterial', 'Dolgu malzemesi', 'Çakıl taşı'],
                                ['stemCount', 'Gövde sayısı', '3'],
                                ['leafCount', 'Yaprak sayısı', '120'],
                                ['comesWith', 'Birlikte gelir', 'Taş, dekoratif toprak'],
                                ['cleaningTip', 'Temizlik notu', 'Nemli bezle silin'],
                              ] as [keyof AiForm, string, string][]).map(([key, label, ph]) => (
                                <div key={key}>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                                  <input
                                    type="text"
                                    value={aiForm[key] as string}
                                    onChange={e => setAiForm(f => ({ ...f, [key]: e.target.value }))}
                                    placeholder={ph}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* İki parça toggle */}
                            <button
                              type="button"
                              onClick={() => setAiForm(f => ({ ...f, comesInTwoParts: !f.comesInTwoParts }))}
                              className="flex items-center gap-3"
                            >
                              <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${aiForm.comesInTwoParts ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${aiForm.comesInTwoParts ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-300">Ürün iki parça halinde gönderilir</span>
                            </button>

                            {/* Ek notlar */}
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ek notlar / özellikler</label>
                              <textarea
                                rows={2}
                                value={aiForm.extraNotes}
                                onChange={e => setAiForm(f => ({ ...f, extraNotes: e.target.value }))}
                                placeholder="Örn: UV dayanımlı yapraklar, renk seçeneği mevcut…"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                              />
                            </div>

                            {/* Üret butonu */}
                            <button
                              onClick={generateAi}
                              disabled={aiLoading}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              {aiLoading ? 'Gemini yazıyor…' : 'Üret'}
                            </button>

                            {/* Sonuç */}
                            {aiResult && (
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 space-y-2.5 border border-purple-200 dark:border-purple-700">
                                <div>
                                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-0.5">SEO Ürün Adı</p>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{aiResult.productName}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-0.5">Açıklama</p>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">{aiResult.description}</p>
                                </div>
                                {aiResult.hashtags.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-0.5">Hashtagler</p>
                                    <p className="text-xs text-purple-700 dark:text-purple-300 flex flex-wrap gap-1">
                                      {aiResult.hashtags.map((h, i) => <span key={i}>{h}</span>)}
                                    </p>
                                  </div>
                                )}
                                <button
                                  onClick={applyAiResult}
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" /> Açıklama & Adı Uygula
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Fotoğraflar */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5" /> Fotoğraflar
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {editState.imageUrls.map((url, i) => (
                            <div key={i} className="relative group w-20 h-20">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgSrc(url)}
                                alt=""
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(url)}
                                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-opacity"
                                title="Kaldır"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                            title="Fotoğraf ekle"
                          >
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span className="text-xs mt-1">{uploading ? '' : 'Ekle'}</span>
                          </button>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) uploadPhoto(p, f);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>

                      {/* Butonlar */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => save(p)}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Kaydet
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Görüntüleme modu */
                    <div className="flex items-start justify-between gap-3">
                      {p.imageUrls?.length > 0 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgSrc(p.imageUrls[0])}
                          alt=""
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{p.productName}</span>
                          {savedId === p.id && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Kaydedildi
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs font-mono text-gray-400">{p.modelCode}</span>
                          {p.categoryName && (
                            <span className="text-xs px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full">
                              {p.categoryName}
                            </span>
                          )}
                          {!p.categoryId && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                              Kategori yok
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => startEdit(p)}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">
                  {search ? 'Arama sonucu bulunamadı.' : 'Ürün bulunamadı.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
