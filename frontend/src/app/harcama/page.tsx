'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, Plus, Wallet } from 'lucide-react';

interface Category { id: number; name: string; kind: string; }
interface Account { id: number; name: string; type: string; balance: number; }
interface Transaction { id: number; description: string; amount: number; transactionType: string; transactionDate: string; category?: { name: string } | null; account?: { name: string } | null; }

// Akıllı kategori tahmini — anahtar kelimeye göre
const CATEGORY_HINTS: [string[], string][] = [
  [['kargo', 'kurye', 'aras', 'yurtiçi', 'mng', 'ptt', 'ups', 'fedex'], 'Kargo'],
  [['fatura', 'elektrik', 'doğalgaz', 'su', 'internet', 'telefon'], 'Fatura'],
  [['kira', 'aidat'], 'Kira'],
  [['çiçek', 'saksı', 'toprak', 'gübre', 'bitki', 'malzeme', 'ambalaj', 'kutu'], 'Hammadde & Malzeme'],
  [['reklam', 'instagram', 'meta', 'google', 'ads', 'tanıtım'], 'Reklam'],
  [['maaş', 'prim', 'personel', 'çalışan'], 'Personel Maaşı'],
  [['market', 'yemek', 'kahve', 'içecek'], 'Yemek & İçecek'],
  [['vergi', 'sgk', 'sigorta', 'stopaj'], 'Vergi & Sigorta'],
];

function guessCategory(desc: string, categories: Category[]): Category | null {
  const lower = desc.toLowerCase();
  for (const [keywords, catName] of CATEGORY_HINTS) {
    if (keywords.some(k => lower.includes(k))) {
      const found = categories.find(c => c.name.toLowerCase().includes(catName.toLowerCase()) && c.kind === 'EXPENSE');
      if (found) return found;
    }
  }
  return null;
}

export default function HarcamaPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guessed, setGuessed] = useState<Category | null>(null);

  useEffect(() => {
    void (async () => {
      const data = await api<{ categories: Category[]; accounts: Account[] }>('/finance/setup');
      const cats = (data.categories ?? []).filter((c: Category) => c.kind === 'EXPENSE');
      const accs = data.accounts ?? [];
      setCategories(cats);
      setAccounts(accs);
      if (accs.length) setAccountId(String(accs.find(a => a.type === 'CASH')?.id ?? accs[0].id));
    })();
    void loadRecent();
  }, []);

  async function loadRecent() {
    const r = await api<{ transactions: Transaction[] }>('/finance/transactions?type=EXPENSE&limit=10');
    setRecent(r.transactions ?? []);
  }

  function onDescChange(v: string) {
    setDesc(v);
    const g = guessCategory(v, categories);
    setGuessed(g);
    if (g) setCategoryId(String(g.id));
  }

  async function save() {
    if (!desc || !amount || !accountId) { setError('Açıklama, tutar ve hesap zorunlu.'); return; }
    setSaving(true); setError(null); setSuccess(null);
    try {
      await api('/finance/transactions', {
        method: 'POST',
        json: {
          transactionType: 'EXPENSE',
          accountId: Number(accountId),
          categoryId: categoryId ? Number(categoryId) : undefined,
          amount: Number(amount),
          description: desc,
          transactionDate: new Date().toISOString(),
        },
      });
      setSuccess(`${Number(amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} harcama kaydedildi.`);
      setDesc(''); setAmount(''); setGuessed(null);
      await loadRecent();
    } catch {
      setError('Kaydedilemedi, tekrar dene.');
    } finally { setSaving(false); }
  }

  return (
    <main className="p-4 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Wallet size={20} /> Günlük Harcama
      </h1>

      {/* Form */}
      <div className="panel p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Ne için? (akıllı tahmin)</label>
          <input
            autoFocus
            className="field w-full"
            placeholder="örn: Aras kargo ücreti, Çiçek malzeme..."
            value={desc}
            onChange={e => onDescChange(e.target.value)}
          />
          {guessed && (
            <div className="mt-1 text-xs text-brand font-medium">
              ✦ Kategori tahmini: <span className="bg-brand/10 px-1.5 py-0.5 rounded">{guessed.name}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Tutar (₺)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="field w-full text-right font-semibold text-lg"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Ödeme Yöntemi</label>
            <select className="field w-full" value={accountId} onChange={e => setAccountId(e.target.value)}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Kategori</label>
          <select className="field w-full" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Kategorisiz</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <button
          onClick={() => void save()}
          disabled={saving}
          className="btn btn-primary w-full py-2.5 font-bold text-base disabled:opacity-50"
        >
          <Plus size={16} /> {saving ? 'Kaydediliyor...' : 'Harcama Ekle'}
        </button>

        {success && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
            <CheckCircle2 size={14} /> {success}
          </div>
        )}
        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
      </div>

      {/* Son harcamalar */}
      {recent.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-4 py-2 border-b border-line text-xs font-semibold text-slate-500 uppercase tracking-wide">Son Harcamalar</div>
          <div className="divide-y divide-line">
            {recent.map(t => (
              <div key={t.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t.description}</div>
                  <div className="text-xs text-slate-400">{t.category?.name ?? 'Kategorisiz'} · {new Date(t.transactionDate).toLocaleDateString('tr-TR')}</div>
                </div>
                <div className="text-sm font-bold text-red-500">-{Number(t.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
