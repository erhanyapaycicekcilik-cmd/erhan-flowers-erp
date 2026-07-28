'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Archive, Brain, Plus, Save, Settings } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type DefaultExpense = {
  id: number;
  expenseKey: string;
  name: string;
  defaultAmount: number;
  applyCategories: string[];
  excludeCategories: string[];
  isActive: boolean;
  validFrom: string;
  description: string | null;
  status: 'ACTIVE' | 'PASSIVE';
};

const emptyExpense = {
  name: '',
  defaultAmount: 0,
  applyCategories: '',
  excludeCategories: '',
  isActive: true,
  validFrom: new Date().toISOString().slice(0, 10),
  description: '',
  changeScope: 'future_only',
  reason: '',
};

export default function SettingsPage() {
  const [expenses, setExpenses] = useState<DefaultExpense[]>([]);
  const [form, setForm] = useState(emptyExpense);
  const [priceSettings, setPriceSettings] = useState({ marketplaceMarkupPercent: 25, campaignBufferPercent: 10 });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setExpenses(await api<DefaultExpense[]>('/production-costs/default-expenses'));
  }

  useEffect(() => {
    const savedSettings = window.localStorage.getItem('ef_cost_price_settings');
    if (savedSettings) {
      try {
        setPriceSettings({ ...priceSettings, ...JSON.parse(savedSettings) });
      } catch {
        // Geçersiz ayar kaydı yok sayılır.
      }
    }
    load().catch((error) => setMessage(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function savePriceSettings() {
    window.localStorage.setItem('ef_cost_price_settings', JSON.stringify(priceSettings));
    setMessage('Fiyat oranları kaydedildi.');
  }

  async function saveExpense(expense: DefaultExpense, patch: Partial<typeof emptyExpense> = {}) {
    setLoading(true);
    try {
      const payload = {
        name: patch.name ?? expense.name,
        defaultAmount: Number(patch.defaultAmount ?? expense.defaultAmount),
        applyCategories: patch.applyCategories ?? expense.applyCategories.join(', '),
        excludeCategories: patch.excludeCategories ?? expense.excludeCategories.join(', '),
        isActive: patch.isActive ?? expense.isActive,
        validFrom: patch.validFrom ?? expense.validFrom?.slice(0, 10),
        description: patch.description ?? expense.description ?? '',
        changeScope: patch.changeScope ?? 'future_only',
        reason: patch.reason ?? 'Ayarlar ekranından güncellendi',
      };
      await api(`/production-costs/default-expenses/${expense.id}`, { method: 'POST', json: payload });
      setMessage('Varsayılan gider güncellendi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gider güncellenemedi.');
    } finally {
      setLoading(false);
    }
  }

  async function createExpense(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await api('/production-costs/default-expenses', { method: 'POST', json: form });
      setForm(emptyExpense);
      setMessage('Yeni varsayılan gider eklendi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Yeni gider eklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Ayarlar">
      {process.env.NEXT_PUBLIC_ENABLE_KNOWLEDGE_BASE === 'true' && (
        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Brain size={18} />
              <div>
                <h2 className="font-bold">Ürün Bilgi Motoru</h2>
                <p className="text-sm text-slate-500">Bitki türleri, eş anlamlılar, saksı profilleri ve analiz testleri.</p>
              </div>
            </div>
            <Link className="btn btn-secondary" href="/settings/product-knowledge">
              Aç
            </Link>
          </div>
        </section>
      )}

      <section className={`panel p-5 ${process.env.NEXT_PUBLIC_ENABLE_KNOWLEDGE_BASE === 'true' ? 'mt-5' : ''}`}>
        <div className="flex items-center gap-2">
          <Settings size={18} />
          <h2 className="font-bold">Varsayılan Giderler</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Yeni ürün maliyet reçetesi açıldığında bu giderler otomatik gelir. Onaylı eski reçeteler izinsiz değişmez.
        </p>
        {message && <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</div>}

        <div className="mt-5 space-y-3">
          {expenses.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} disabled={loading} onSave={saveExpense} />
          ))}
        </div>
      </section>

      <section className="panel mt-5 p-5">
        <div className="flex items-center gap-2">
          <Settings size={18} />
          <h2 className="font-bold">Fiyat Hesaplama Ayarları</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_160px] md:items-end">
          <NumberField label="Pazaryeri farkı" value={priceSettings.marketplaceMarkupPercent} onChange={(marketplaceMarkupPercent) => setPriceSettings({ ...priceSettings, marketplaceMarkupPercent })} />
          <NumberField label="Kampanya tamponu" value={priceSettings.campaignBufferPercent} onChange={(campaignBufferPercent) => setPriceSettings({ ...priceSettings, campaignBufferPercent })} />
          <button className="btn btn-primary justify-center" onClick={savePriceSettings}>
            <Save size={16} />
            Oranları Kaydet
          </button>
        </div>
      </section>

      <section className="panel mt-5 p-5">
        <div className="flex items-center gap-2">
          <Plus size={18} />
          <h2 className="font-bold">Yeni Gider Ekle</h2>
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={createExpense}>
          <TextField label="Gider adı" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <NumberField label="Varsayılan tutar" value={form.defaultAmount} onChange={(defaultAmount) => setForm({ ...form, defaultAmount })} />
          <TextField label="Uygulanacağı kategoriler" value={form.applyCategories} onChange={(applyCategories) => setForm({ ...form, applyCategories })} placeholder="Boşsa tümü" />
          <TextField label="Uygulanmayacağı kategoriler" value={form.excludeCategories} onChange={(excludeCategories) => setForm({ ...form, excludeCategories })} placeholder="Örn: Bambu" />
          <TextField label="Başlangıç tarihi" value={form.validFrom} onChange={(validFrom) => setForm({ ...form, validFrom })} type="date" />
          <TextField label="Açıklama" value={form.description} onChange={(description) => setForm({ ...form, description })} />
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            Aktif
          </label>
          <button className="btn btn-primary justify-center" disabled={loading}>
            <Save size={16} />
            Gider Ekle
          </button>
        </form>
      </section>
    </AdminShell>
  );
}

function ExpenseRow({ expense, disabled, onSave }: { expense: DefaultExpense; disabled: boolean; onSave: (expense: DefaultExpense, patch: Partial<typeof emptyExpense>) => void }) {
  const [draft, setDraft] = useState({
    name: expense.name,
    defaultAmount: expense.defaultAmount,
    applyCategories: expense.applyCategories.join(', '),
    excludeCategories: expense.excludeCategories.join(', '),
    isActive: expense.isActive,
    validFrom: expense.validFrom?.slice(0, 10),
    description: expense.description ?? '',
    changeScope: 'future_only',
    reason: '',
  });

  useEffect(() => {
    setDraft({
      name: expense.name,
      defaultAmount: expense.defaultAmount,
      applyCategories: expense.applyCategories.join(', '),
      excludeCategories: expense.excludeCategories.join(', '),
      isActive: expense.isActive,
      validFrom: expense.validFrom?.slice(0, 10),
      description: expense.description ?? '',
      changeScope: 'future_only',
      reason: '',
    });
  }, [expense]);

  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="grid gap-3 xl:grid-cols-[1.1fr_120px_1fr_1fr_130px] xl:items-end">
        <TextField label="Gider adı" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <NumberField label="Tutar" value={draft.defaultAmount} onChange={(defaultAmount) => setDraft({ ...draft, defaultAmount })} />
        <TextField label="Uygulanacağı kategoriler" value={draft.applyCategories} onChange={(applyCategories) => setDraft({ ...draft, applyCategories })} placeholder="Boşsa tümü" />
        <TextField label="Uygulanmayacağı kategoriler" value={draft.excludeCategories} onChange={(excludeCategories) => setDraft({ ...draft, excludeCategories })} />
        <label className="flex min-h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold">
          <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
          {draft.isActive ? 'Aktif' : 'Pasif'}
        </label>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[180px_1fr_1.2fr_150px_150px] xl:items-end">
        <TextField label="Başlangıç tarihi" value={draft.validFrom} onChange={(validFrom) => setDraft({ ...draft, validFrom })} type="date" />
        <TextField label="Açıklama" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
        <TextField label="Değişiklik açıklaması" value={draft.reason} onChange={(reason) => setDraft({ ...draft, reason })} />
        <label className="block space-y-1.5">
          <span className="label">Uygulama</span>
          <select className="field" value={draft.changeScope} onChange={(event) => setDraft({ ...draft, changeScope: event.target.value })}>
            <option value="future_only">Sadece yeni reçeteler</option>
            <option value="drafts">Taslak reçeteleri güncelle</option>
            <option value="selected_existing">Seçili ürünleri güncelle</option>
            <option value="all_existing">Tüm mevcut reçeteleri güncelle</option>
          </select>
        </label>
        <button className="btn btn-primary justify-center" disabled={disabled} onClick={() => onSave(expense, draft)}>
          <Save size={16} />
          Kaydet
        </button>
      </div>
      <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500" onClick={() => onSave(expense, { ...draft, isActive: false, changeScope: 'future_only', reason: 'Arşivlendi' })}>
        <Archive size={14} />
        Silme yerine pasife al
      </button>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      <input className="field" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="label">{label}</span>
      <input className="field" type="number" min="0" step="0.01" value={value === 0 ? '' : value} onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
    </label>
  );
}
