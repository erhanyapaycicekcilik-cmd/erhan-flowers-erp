'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import { Employee, EmployeePhoto, fmtDate, seniority, today } from './shared';

const STATUS_TABS = [
  { key: 'ACTIVE', label: 'Çalışanlar' },
  { key: 'LEFT', label: 'Ayrılanlar' },
  { key: 'ALL', label: 'Tümü' },
];

export default function PersonnelListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Employee[]>([]);
  const [status, setStatus] = useState('ACTIVE');
  const [q, setQ] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', position: '', hireDate: today() });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<{ rows: Employee[] }>(`/personnel?status=${status}&year=${year}&q=${encodeURIComponent(q)}`);
      setRows(res.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Liste alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [status, year, q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function create() {
    setSaving(true);
    setError('');
    try {
      const e = await api<Employee>('/personnel', { method: 'POST', json: form });
      router.push(`/personel/${e.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.');
      setSaving(false);
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <AdminShell title="Personel Özlük Dosyası">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            {STATUS_TABS.map((t) => (
              <button key={t.key} onClick={() => setStatus(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${status === t.key ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim, telefon, görev ara…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
          </div>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" title="Devamsızlık özet yılı">
            {years.map((y) => <option key={y} value={y}>{y} özeti</option>)}
          </select>
          <button onClick={() => void load()} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600" title="Yenile"><RefreshCw size={16} /></button>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
            <Plus size={16} /> Yeni Personel
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {showNew && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Yeni personel</h2>
              <button onClick={() => setShowNew(false)} className="text-slate-500"><X size={18} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Ad Soyad *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoFocus />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Görevi" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              <label className="text-xs font-semibold text-slate-500">İşe giriş tarihi *
                <input type="date" className="mt-0.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={() => void create()} disabled={saving || !form.fullName.trim() || !form.hireDate}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? 'Kaydediliyor…' : 'Oluştur ve Dosyayı Aç'}
              </button>
              <span className="text-xs text-slate-500">Fotoğraf, TC, adres ve diğer bilgileri açılan dosyada girersiniz.</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Yükleniyor…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
            Kayıt yok. “Yeni Personel” ile ekleyin.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((e) => (
              <Link key={e.id} href={`/personel/${e.id}`}
                className={`flex gap-3 rounded-xl border bg-white p-3 shadow-sm transition hover:border-emerald-400 ${e.status === 'LEFT' ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
                <EmployeePhoto id={e.id} hasPhoto={e.hasPhoto} version={e.updatedAt} className="h-20 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate font-bold">{e.fullName}</div>
                    {e.status === 'LEFT'
                      ? <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">AYRILDI</span>
                      : <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">ÇALIŞIYOR</span>}
                  </div>
                  <div className="truncate text-xs text-slate-500">{[e.position, e.phone].filter(Boolean).join(' · ') || '—'}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Giriş: <b>{fmtDate(e.hireDate)}</b>
                    {e.terminationDate && <> · Çıkış: <b>{fmtDate(e.terminationDate)}</b></>}
                    <span className="text-slate-400"> · {seniority(e.hireDate, e.terminationDate).text}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] font-semibold">
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">Gelmedi {e.absentDays ?? 0} gün</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">İzin {e.leaveDays ?? 0} gün</span>
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Erken çıkış {e.earlyLeaves ?? 0}</span>
                    {(e.lates ?? 0) > 0 && <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-700">Geç {e.lates}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
