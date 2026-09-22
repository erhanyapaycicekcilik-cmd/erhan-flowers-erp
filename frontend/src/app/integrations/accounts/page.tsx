'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { CheckCircle2, XCircle, AlertCircle, Save, TestTube2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';

const COMPANIES = [
  { code: 'ERHAN', name: 'Erhan Flowers', domain: 'erhanflowers.com' },
  { code: 'FLORA', name: 'Flora Yapay Çiçek', domain: 'florayapaycicek.com' },
];

const PLATFORM_LABELS: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'N11',
  TICIMAX: 'Ticimax',
  AMAZON: 'Amazon',
  PAZARAMA: 'Pazarama',
  IDEFIX: 'Idefix',
  TEKLIKLE: 'Teklikle',
  TRENDRUM: 'Trendrum',
};

const FIELD_LABELS: Record<string, string> = {
  SUPPLIER_ID: 'Satıcı ID',
  API_KEY: 'API Key',
  API_SECRET: 'API Secret',
  MERCHANT_ID: 'Merchant ID',
  USER_AGENT: 'User Agent',
  UYE_KODU: 'Üye Kodu',
  USERNAME: 'Kullanıcı Adı',
  PASSWORD: 'Şifre',
  TOKEN: 'Token',
};

type CredentialEntry = { maskedValue?: string; updatedAt?: string };

type PlatformSetting = {
  platform: string;
  platformName: string;
  accountId: number | null;
  accountName: string;
  externalAccountId: string;
  status: string;
  isTestMode: boolean;
  requiredCredentials: string[];
  credentials: Record<string, CredentialEntry>;
};

function statusBadge(status: string) {
  if (status === 'CONNECTED') return <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 size={13} /> Bağlı</span>;
  if (status === 'FAILED') return <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><XCircle size={13} /> Hatalı</span>;
  if (status === 'CONFIGURED') return <span className="flex items-center gap-1 text-amber-600 text-xs font-medium"><AlertCircle size={13} /> Yapılandırıldı</span>;
  return <span className="text-slate-400 text-xs">Yapılandırılmamış</span>;
}

function PlatformCard({ setting, company, onSaved }: { setting: PlatformSetting; company: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');

  const isConfigured = setting.status !== 'NOT_CONFIGURED';

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/integrations/platform-settings/${setting.platform}?company=${company}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountName: form.accountName || setting.accountName,
          externalAccountId: form.externalAccountId || setting.externalAccountId,
          isTestMode: false,
          credentials: Object.fromEntries(setting.requiredCredentials.map((f) => [f, form[f] ?? ''])),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg('Kaydedildi ✓');
      setForm({});
      onSaved();
    } catch (e: unknown) {
      setMsg('Hata: ' + String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (!setting.accountId) return;
    setTesting(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/integrations/accounts/${setting.accountId}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setMsg(data.success ? '✓ Bağlantı başarılı' : '✗ ' + (data.message ?? 'Bağlantı hatası'));
    } catch {
      setMsg('Test başarısız');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">{setting.platformName}</span>
          {statusBadge(setting.status)}
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Hesap Adı</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                placeholder={setting.accountName}
                value={form.accountName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Satıcı / Dükkan ID</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                placeholder={setting.externalAccountId || 'örn: 1091873'}
                value={form.externalAccountId ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, externalAccountId: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">API Bilgileri</p>
            {setting.requiredCredentials.map((field) => {
              const existing = setting.credentials[FIELD_LABELS[field] ?? field];
              return (
                <div key={field} className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 w-28 shrink-0">{FIELD_LABELS[field] ?? field}</label>
                  <div className="relative flex-1">
                    <input
                      type={show[field] ? 'text' : 'password'}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white pr-9"
                      placeholder={existing?.maskedValue ? existing.maskedValue + ' (değiştirmek için gir)' : 'Yeni değer gir'}
                      value={form[field] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {show[field] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            {isConfigured && (
              <button
                onClick={test}
                disabled={testing}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                <TestTube2 size={14} />
                {testing ? 'Test ediliyor…' : 'Bağlantı Testi'}
              </button>
            )}
            {msg && <span className={`text-sm ${msg.startsWith('Hata') || msg.startsWith('✗') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const [company, setCompany] = useState('ERHAN');
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/integrations/platform-settings?company=${company}`, { credentials: 'include' });
      setSettings(await res.json());
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Platform Hesapları</h1>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            {COMPANIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCompany(c.code)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${company === c.code ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-500">
          {COMPANIES.find((c) => c.code === company)?.domain} — Her platform için API bilgilerini girin.
          Boş bıraktığınız alanlar mevcut değerini korur.
        </p>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Yükleniyor…</div>
        ) : (
          <div className="space-y-2">
            {settings.map((s) => (
              <PlatformCard key={s.platform} setting={s} company={company} onSaved={load} />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
