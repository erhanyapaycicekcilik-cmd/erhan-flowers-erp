'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import { Globe, LayoutGrid, Plus, Save, Trash2, X } from 'lucide-react';

type Category = {
  id: number;
  name: string;
  codePrefix: string;
  startCode: number;
  currentCode: number;
  trendyolCategoryId: number | null;
  platforms: string[];
  hasBanner: boolean;
  sortOrder: number;
  description: string | null;
  status: string;
};

const PLATFORMS = [
  { key: 'WEB', label: 'Web Sitesi', color: '#2B5797', bg: '#E3ECFA' },
  { key: 'TRENDYOL', label: 'Trendyol', color: '#F27A1A', bg: '#FEF0E2' },
  { key: 'N11', label: 'N11', color: '#7B2FBE', bg: '#F1E8FC' },
  { key: 'HEPSIBURADA', label: 'Hepsiburada', color: '#C0392B', bg: '#FAEAE8' },
];

type ModalState = {
  open: boolean;
  name: string;
  codePrefix: string;
  startCode: string;
  description: string;
  platforms: string[];
  hasBanner: boolean;
};

const emptyModal: ModalState = {
  open: false,
  name: '',
  codePrefix: '',
  startCode: '',
  description: '',
  platforms: [],
  hasBanner: false,
};

export default function KategorilerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>(emptyModal);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api('/categories');
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const togglePlatform = (cat: Category, platform: string) => {
    const has = cat.platforms.includes(platform);
    const updated = has
      ? cat.platforms.filter(p => p !== platform)
      : [...cat.platforms, platform];
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, platforms: updated } : c));
  };

  const toggleBanner = (cat: Category) => {
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, hasBanner: !c.hasBanner } : c));
  };

  const save = async (cat: Category) => {
    setSaving(cat.id);
    try {
      await api(`/categories/${cat.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ platforms: cat.platforms, hasBanner: cat.hasBanner }),
      });
    } finally {
      setSaving(null);
    }
  };

  const handleCreate = async () => {
    if (!modal.name || !modal.codePrefix || !modal.startCode) return;
    setCreating(true);
    try {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: modal.name,
          codePrefix: modal.codePrefix,
          startCode: Number(modal.startCode),
          description: modal.description || undefined,
          platforms: modal.platforms,
          hasBanner: modal.hasBanner,
        }),
      });
      setModal(emptyModal);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kategoriyi pasife almak istediğinize emin misiniz?')) return;
    setDeleting(id);
    try {
      await api(`/categories/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setDeleting(null);
    }
  };

  const modalTogglePlatform = (platform: string) => {
    setModal(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  return (
    <AdminShell>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Kategori Yönetimi</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kategorileri düzenleyin ve platform atamalarını yapın</p>
            </div>
          </div>
          <button
            onClick={() => setModal({ ...emptyModal, open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Kategori
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PLATFORMS.map(p => (
            <span key={p.key} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: p.color, background: p.bg }}>
              <Globe className="w-3 h-3" />
              {p.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            🏷 Banner
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Yükleniyor…</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Kategori</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Kod</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Platformlar</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Banner</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{cat.name}</div>
                      {cat.description && (
                        <div className="text-xs text-gray-400 mt-0.5">{cat.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                        {cat.codePrefix}-{cat.startCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {PLATFORMS.map(p => {
                          const active = cat.platforms.includes(p.key);
                          return (
                            <button
                              key={p.key}
                              onClick={() => togglePlatform(cat, p.key)}
                              className="text-xs px-2.5 py-1 rounded-full font-medium border transition-all"
                              style={active
                                ? { color: p.color, background: p.bg, borderColor: p.color + '40' }
                                : { color: '#9CA3AF', background: 'transparent', borderColor: '#E5E7EB' }
                              }
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleBanner(cat)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                          cat.hasBanner
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                        }`}
                        title={cat.hasBanner ? 'Banner var' : 'Banner yok'}
                      >
                        🏷
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => save(cat)}
                          disabled={saving === cat.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {saving === cat.id ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={deleting === cat.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Pasife Al"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {categories.length === 0 && (
              <div className="text-center py-16 text-gray-400">Henüz kategori yok.</div>
            )}
          </div>
        )}
      </div>

      {/* Yeni Kategori Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Yeni Kategori Ekle</h2>
              <button
                onClick={() => setModal(emptyModal)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori Adı *</label>
                <input
                  type="text"
                  value={modal.name}
                  onChange={e => setModal(p => ({ ...p, name: e.target.value }))}
                  placeholder="ör. Vazo & Aksesuar"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kod Prefix *</label>
                  <input
                    type="text"
                    value={modal.codePrefix}
                    onChange={e => setModal(p => ({ ...p, codePrefix: e.target.value.toUpperCase() }))}
                    placeholder="ör. VA"
                    maxLength={5}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Başlangıç Kodu *</label>
                  <input
                    type="number"
                    value={modal.startCode}
                    onChange={e => setModal(p => ({ ...p, startCode: e.target.value }))}
                    placeholder="ör. 5000"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={modal.description}
                  onChange={e => setModal(p => ({ ...p, description: e.target.value }))}
                  placeholder="İsteğe bağlı kısa açıklama"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platformlar</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => {
                    const active = modal.platforms.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => modalTogglePlatform(p.key)}
                        className="text-sm px-3 py-1.5 rounded-full font-medium border-2 transition-all"
                        style={active
                          ? { color: p.color, background: p.bg, borderColor: p.color }
                          : { color: '#9CA3AF', background: 'transparent', borderColor: '#E5E7EB' }
                        }
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setModal(p => ({ ...p, hasBanner: !p.hasBanner }))}
                  className={`w-10 h-6 rounded-full transition-colors relative ${modal.hasBanner ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${modal.hasBanner ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Banner Var</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setModal(emptyModal)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !modal.name || !modal.codePrefix || !modal.startCode}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {creating ? 'Oluşturuluyor…' : 'Kategori Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
