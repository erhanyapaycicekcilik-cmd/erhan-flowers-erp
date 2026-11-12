'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, FileText, Paperclip, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import { annualLeaveRight, ATTENDANCE, EmployeeDetail, EmployeePhoto, fmtDate, openDocument, seniority, today } from '../shared';

type Form = Record<string, string>;

const FIELDS: Array<{ section: string; items: Array<{ key: string; label: string; type?: string; wide?: boolean; options?: string[] }> }> = [
  {
    section: 'Kimlik & İletişim',
    items: [
      { key: 'fullName', label: 'Ad Soyad *' },
      { key: 'nationalId', label: 'TC Kimlik No' },
      { key: 'birthDate', label: 'Doğum Tarihi', type: 'date' },
      { key: 'gender', label: 'Cinsiyet', options: ['', 'Kadın', 'Erkek'] },
      { key: 'bloodType', label: 'Kan Grubu', options: ['', '0 Rh+', '0 Rh-', 'A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-'] },
      { key: 'phone', label: 'Telefon' },
      { key: 'email', label: 'E-posta' },
      { key: 'address', label: 'Adres', type: 'textarea', wide: true },
    ],
  },
  {
    section: 'İş Bilgileri',
    items: [
      { key: 'position', label: 'Görevi' },
      { key: 'department', label: 'Bölüm' },
      { key: 'hireDate', label: 'İşe Giriş Tarihi *', type: 'date' },
      { key: 'terminationDate', label: 'İşten Çıkış Tarihi', type: 'date' },
      { key: 'terminationReason', label: 'Çıkış Nedeni', wide: true },
      { key: 'sgkNumber', label: 'SGK Sicil No' },
      { key: 'netSalary', label: 'Net Maaş (₺)' },
      { key: 'iban', label: 'IBAN', wide: true },
    ],
  },
  {
    section: 'Acil Durum & Notlar',
    items: [
      { key: 'emergencyName', label: 'Acil Durumda Aranacak Kişi' },
      { key: 'emergencyPhone', label: 'Acil Durum Telefonu' },
      { key: 'notes', label: 'Notlar', type: 'textarea', wide: true },
    ],
  },
];

function toForm(e: EmployeeDetail): Form {
  const f: Form = {};
  FIELDS.forEach((s) => s.items.forEach((i) => {
    const v = (e as unknown as Record<string, unknown>)[i.key];
    f[i.key] = v === null || v === undefined ? '' : String(v);
  }));
  return f;
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [emp, setEmp] = useState<EmployeeDetail | null>(null);
  const [form, setForm] = useState<Form>({});
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [att, setAtt] = useState({ type: 'ABSENT', startDate: today(), endDate: today(), time: '', note: '' });
  const [docTitle, setDocTitle] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const apply = useCallback((e: EmployeeDetail) => {
    setEmp(e);
    setForm(toForm(e));
    setDirty(false);
  }, []);

  useEffect(() => {
    api<EmployeeDetail>(`/personnel/${id}`).then(apply).catch((e) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Kayıt bulunamadı.' }));
  }, [id, apply]);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    if (ok) setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), 3000);
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try { await fn(); } catch (e) { flash(false, e instanceof Error ? e.message : 'İşlem başarısız.'); } finally { setBusy(''); }
  }

  const save = () => run('save', async () => {
    apply(await api<EmployeeDetail>(`/personnel/${id}`, { method: 'PATCH', json: form }));
    flash(true, 'Kaydedildi.');
  });

  const uploadPhoto = (file: File) => run('photo', async () => {
    const fd = new FormData();
    fd.append('file', file);
    await api(`/personnel/${id}/photo`, { method: 'POST', body: fd });
    apply(await api<EmployeeDetail>(`/personnel/${id}`));
    flash(true, 'Fotoğraf güncellendi.');
  });

  const addAttendance = () => run('att', async () => {
    const unit = ATTENDANCE[att.type].unit;
    apply(await api<EmployeeDetail>(`/personnel/${id}/attendance`, {
      method: 'POST',
      json: { type: att.type, startDate: att.startDate, endDate: unit === 'DAY' ? att.endDate : undefined, time: unit === 'TIMES' ? att.time : undefined, note: att.note },
    }));
    setAtt((a) => ({ ...a, note: '', time: '' }));
    flash(true, `${ATTENDANCE[att.type].label} kaydı eklendi.`);
  });

  const deleteAttendance = (attId: number) => {
    if (!confirm('Bu kayıt silinsin mi?')) return;
    void run('att', async () => {
      await api(`/personnel/attendance/${attId}`, { method: 'DELETE' });
      apply(await api<EmployeeDetail>(`/personnel/${id}`));
    });
  };

  const uploadDoc = (file: File) => run('doc', async () => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', docTitle.trim() || file.name);
    apply(await api<EmployeeDetail>(`/personnel/${id}/documents`, { method: 'POST', body: fd }));
    setDocTitle('');
    flash(true, 'Belge eklendi.');
  });

  const deleteDoc = (docId: number) => {
    if (!confirm('Belge silinsin mi?')) return;
    void run('doc', async () => {
      await api(`/personnel/documents/${docId}`, { method: 'DELETE' });
      apply(await api<EmployeeDetail>(`/personnel/${id}`));
    });
  };

  const removeEmployee = () => {
    if (!emp) return;
    if (!confirm(`${emp.fullName} dosyası, tüm devamsızlık kayıtları ve belgeleriyle KALICI olarak silinsin mi?\n\nİşten ayrıldıysa silmek yerine "İşten Çıkış Tarihi" girmeniz önerilir.`)) return;
    void run('delete', async () => {
      await api(`/personnel/${id}`, { method: 'DELETE' });
      router.push('/personel');
    });
  };

  const yearRows = useMemo(() => (emp?.attendance ?? []).filter((a) => a.startDate.startsWith(String(year))), [emp, year]);
  const summary = useMemo(() => {
    const s: Record<string, number> = {};
    yearRows.forEach((a) => { s[a.type] = (s[a.type] ?? 0) + (ATTENDANCE[a.type]?.unit === 'DAY' ? a.days : 1); });
    return s;
  }, [yearRows]);
  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    (emp?.attendance ?? []).forEach((a) => set.add(Number(a.startDate.slice(0, 4))));
    return Array.from(set).sort((a, b) => b - a);
  }, [emp]);

  if (!emp) {
    return (
      <AdminShell title="Personel">
        <div className="py-10 text-center text-sm text-slate-500">{msg?.text ?? 'Yükleniyor…'}</div>
      </AdminShell>
    );
  }

  const sen = seniority(emp.hireDate, emp.terminationDate);
  const right = annualLeaveRight(sen.years);
  const usedAnnual = summary.ANNUAL_LEAVE ?? 0;
  const unit = ATTENDANCE[att.type].unit;

  return (
    <AdminShell title="Personel Özlük Dosyası">
      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/personel" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <ArrowLeft size={15} /> Liste
          </Link>
          <div className="ml-auto flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
              <Printer size={15} /> Özlük Kartı Yazdır
            </button>
            <button onClick={() => void save()} disabled={!dirty || !!busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              <Save size={15} /> {busy === 'save' ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>

        {msg && <div className={`rounded-lg border px-4 py-3 text-sm ${msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{msg.text}</div>}

        {/* Başlık kartı */}
        <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <button type="button" onClick={() => photoInput.current?.click()} className="group relative h-36 w-28 shrink-0 overflow-hidden rounded-lg" title="Fotoğraf yükle / değiştir">
            <EmployeePhoto id={emp.id} hasPhoto={emp.hasPhoto} version={emp.updatedAt} className="h-full w-full" />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[11px] font-semibold text-white opacity-90 group-hover:opacity-100">
              <Camera size={12} /> {busy === 'photo' ? 'Yükleniyor…' : emp.hasPhoto ? 'Değiştir' : 'Fotoğraf ekle'}
            </span>
          </button>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadPhoto(f); }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{emp.fullName}</h2>
              {emp.status === 'LEFT'
                ? <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">AYRILDI</span>
                : <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">ÇALIŞIYOR</span>}
            </div>
            <div className="text-sm text-slate-500">{[emp.position, emp.department].filter(Boolean).join(' · ') || 'Görev girilmemiş'}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Stat label="İşe giriş" value={fmtDate(emp.hireDate)} />
              <Stat label="İşten çıkış" value={emp.terminationDate ? fmtDate(emp.terminationDate) : '—'} />
              <Stat label="Kıdem" value={sen.text} />
              <Stat label={`${year} yıllık izin`} value={right ? `${usedAnnual} / ${right} gün (kalan ${Math.max(0, right - usedAnnual)})` : `${usedAnnual} gün (hak 1. yılda)`} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Bilgi formu */}
          <div className="space-y-4">
            {FIELDS.map((s) => (
              <div key={s.section} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">{s.section}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {s.items.map((i) => (
                    <label key={i.key} className={`block ${i.wide ? 'sm:col-span-2' : ''}`}>
                      <span className="mb-1 block text-xs font-semibold text-slate-500">{i.label}</span>
                      {i.options ? (
                        <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form[i.key] ?? ''} onChange={(e) => { setForm({ ...form, [i.key]: e.target.value }); setDirty(true); }}>
                          {i.options.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                        </select>
                      ) : i.type === 'textarea' ? (
                        <textarea rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form[i.key] ?? ''} onChange={(e) => { setForm({ ...form, [i.key]: e.target.value }); setDirty(true); }} />
                      ) : (
                        <input type={i.type ?? 'text'} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form[i.key] ?? ''} onChange={(e) => { setForm({ ...form, [i.key]: e.target.value }); setDirty(true); }} />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => void save()} disabled={!dirty || !!busy} className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {dirty ? 'Değişiklikleri Kaydet' : 'Kaydedildi'}
            </button>
          </div>

          <div className="space-y-4">
            {/* Devamsızlık / izin */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Devamsızlık · İzin · Erken Çıkış</h3>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-slate-200 px-2 py-1 text-sm">
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={att.type} onChange={(e) => setAtt({ ...att, type: e.target.value })}>
                  {Object.entries(ATTENDANCE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  {unit === 'DAY' ? 'Başlangıç' : 'Tarih'}
                  <input type="date" className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-900" value={att.startDate}
                    onChange={(e) => setAtt({ ...att, startDate: e.target.value, endDate: att.endDate < e.target.value ? e.target.value : att.endDate })} />
                </label>
                {unit === 'DAY' ? (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    Bitiş
                    <input type="date" min={att.startDate} className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-900" value={att.endDate} onChange={(e) => setAtt({ ...att, endDate: e.target.value })} />
                  </label>
                ) : (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    {att.type === 'LATE' ? 'Geliş saati' : 'Çıkış saati'}
                    <input type="time" className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-900" value={att.time} onChange={(e) => setAtt({ ...att, time: e.target.value })} />
                  </label>
                )}
                <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Açıklama (neden, kim onayladı…)" value={att.note} onChange={(e) => setAtt({ ...att, note: e.target.value })} />
                <button onClick={() => void addAttendance()} disabled={busy === 'att'} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">
                  <Plus size={15} /> Kaydet
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
                {Object.entries(ATTENDANCE).map(([k, v]) => (
                  <span key={k} className={`rounded-full px-2.5 py-1 ${v.color}`}>
                    {v.label}: {summary[k] ?? 0} {v.unit === 'DAY' ? 'gün' : 'kez'}
                  </span>
                ))}
              </div>

              <div className="mt-3 divide-y divide-slate-100">
                {yearRows.length === 0 && <div className="py-4 text-center text-sm text-slate-400">{year} için kayıt yok.</div>}
                {yearRows.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 text-sm">
                    <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-bold ${ATTENDANCE[a.type]?.color ?? 'bg-slate-100'}`}>{ATTENDANCE[a.type]?.label ?? a.type}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {fmtDate(a.startDate)}
                        {a.endDate !== a.startDate && <> – {fmtDate(a.endDate)}</>}
                        {ATTENDANCE[a.type]?.unit === 'DAY' && a.days > 1 && <span className="font-normal text-slate-500"> ({a.days} gün)</span>}
                        {a.time && <span className="font-normal text-slate-500"> · saat {a.time}</span>}
                      </div>
                      {a.note && <div className="text-xs text-slate-500">{a.note}</div>}
                    </div>
                    <button onClick={() => deleteAttendance(a.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Belgeler */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Özlük Belgeleri</h3>
              <div className="flex flex-wrap gap-2">
                <input className="min-w-[160px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Belge adı (Sözleşme, Kimlik, Diploma, SGK giriş…)" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
                <button onClick={() => docInput.current?.click()} disabled={busy === 'doc'} className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  <Paperclip size={15} /> {busy === 'doc' ? 'Yükleniyor…' : 'Dosya Seç'}
                </button>
                <input ref={docInput} type="file" accept="image/*,application/pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void uploadDoc(f); }} />
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {emp.documents.length === 0 && <div className="py-3 text-center text-sm text-slate-400">Belge yok.</div>}
                {emp.documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 py-2 text-sm">
                    <FileText size={16} className="shrink-0 text-slate-400" />
                    <button onClick={() => void openDocument(d.id)} className="min-w-0 flex-1 truncate text-left font-semibold text-sky-700 hover:underline">{d.title}</button>
                    <span className="shrink-0 text-xs text-slate-400">{fmtDate(d.createdAt)}</span>
                    <button onClick={() => deleteDoc(d.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Sil"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={removeEmployee} className="w-full rounded-lg border border-red-200 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
              Personel dosyasını kalıcı sil
            </button>
          </div>
        </div>
      </div>

      {/* Yazdırılabilir özlük kartı */}
      <div className="print-only">
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#0f172a', fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>PERSONEL ÖZLÜK KARTI</div>
            <div>Basım: {fmtDate(today())}</div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <EmployeePhoto id={emp.id} hasPhoto={emp.hasPhoto} version={emp.updatedAt} className="h-40 w-32 border border-slate-300" />
            <table style={{ flex: 1, borderCollapse: 'collapse' }}>
              <tbody>
                {FIELDS.flatMap((s) => s.items).filter((i) => i.key !== 'notes').map((i) => (
                  <tr key={i.key}>
                    <td style={{ padding: '3px 6px', fontWeight: 700, width: '38%', borderBottom: '1px solid #e2e8f0' }}>{i.label.replace(' *', '')}</td>
                    <td style={{ padding: '3px 6px', borderBottom: '1px solid #e2e8f0' }}>{i.type === 'date' ? fmtDate(form[i.key]) : form[i.key] || '—'}</td>
                  </tr>
                ))}
                <tr><td style={{ padding: '3px 6px', fontWeight: 700 }}>Kıdem</td><td style={{ padding: '3px 6px' }}>{sen.text}</td></tr>
              </tbody>
            </table>
          </div>
          {form.notes && <div style={{ marginTop: 10 }}><b>Notlar:</b> {form.notes}</div>}
          <div style={{ marginTop: 16, fontWeight: 900, fontSize: 14 }}>{year} Devamsızlık / İzin Kayıtları</div>
          <div style={{ margin: '4px 0 6px' }}>
            {Object.entries(ATTENDANCE).map(([k, v]) => `${v.label}: ${summary[k] ?? 0} ${v.unit === 'DAY' ? 'gün' : 'kez'}`).join('  ·  ')}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Tür', 'Tarih', 'Gün / Saat', 'Açıklama'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 4, border: '1px solid #cbd5e1' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {yearRows.map((a) => (
                <tr key={a.id}>
                  <td style={{ padding: 4, border: '1px solid #cbd5e1' }}>{ATTENDANCE[a.type]?.label ?? a.type}</td>
                  <td style={{ padding: 4, border: '1px solid #cbd5e1' }}>{fmtDate(a.startDate)}{a.endDate !== a.startDate ? ` – ${fmtDate(a.endDate)}` : ''}</td>
                  <td style={{ padding: 4, border: '1px solid #cbd5e1' }}>{ATTENDANCE[a.type]?.unit === 'DAY' ? `${a.days} gün` : a.time ?? ''}</td>
                  <td style={{ padding: 4, border: '1px solid #cbd5e1' }}>{a.note ?? ''}</td>
                </tr>
              ))}
              {yearRows.length === 0 && <tr><td colSpan={4} style={{ padding: 6, border: '1px solid #cbd5e1', textAlign: 'center' }}>Kayıt yok</td></tr>}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
            <div>Personel İmza</div>
            <div>İşveren İmza / Kaşe</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .print-only { display: none; }
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { display: block; position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase text-slate-500">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
