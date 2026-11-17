'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

type Advance = { id: number; date: string; amount: number; note: string | null }
type Row = {
  employeeId: number
  fullName: string
  position: string | null
  iban: string | null
  netSalary: number
  advances: Advance[]
  advanceTotal: number
  payable: number
  paidAt: string | null
  paidAmount: number | null
  note: string | null
}
type Sheet = {
  year: number
  month: number
  payday: number
  dueDate: string
  rows: Row[]
  totals: { net: number; advances: number; payable: number; paid: number }
}

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayIso = () => new Date().toISOString().slice(0, 10)

/** Personel maaşları: net maaş − ay içindeki avanslar = ödenecek; ödendi işaretleme */
export function SalariesPanel({ onChange }: { onChange?: () => void }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [advFor, setAdvFor] = useState<Row | null>(null)
  const [advForm, setAdvForm] = useState({ date: todayIso(), amount: '', note: '' })
  const [payFor, setPayFor] = useState<{ row: Row; amount: string; note: string } | null>(null)
  const [paydayEdit, setPaydayEdit] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setSheet(await api<Sheet>(`/salaries?year=${year}&month=${month}`)) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Yüklenemedi') }
    finally { setLoading(false) }
  }, [year, month])

  useEffect(() => { void load() }, [load])

  const after = async (p: Promise<unknown>) => {
    try { await p; await load(); onChange?.() } catch (e) { setMsg(e instanceof Error ? e.message : 'İşlem başarısız') }
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  const prev = () => { if (month === 1) { setYear(year - 1); setMonth(12) } else setMonth(month - 1) }
  const next = () => { if (month === 12) { setYear(year + 1); setMonth(1) } else setMonth(month + 1) }
  const due = sheet ? new Date(sheet.dueDate) : null
  const overdue = (r: Row) => !r.paidAt && due != null && due < new Date(new Date().toDateString())

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Personel Maaşları</h2>
          <p className="text-sm text-gray-500">
            Ödenecek = net maaş − o ay verilen avanslar.{' '}
            {sheet && (
              paydayEdit === null ? (
                <>Maaş günü: <b>her ayın {sheet.payday}.</b> <button className="text-blue-600 underline" onClick={() => setPaydayEdit(String(sheet.payday))}>değiştir</button></>
              ) : (
                <span className="inline-flex items-center gap-1">
                  Maaş günü
                  <input type="number" min={1} max={31} value={paydayEdit} onChange={(e) => setPaydayEdit(e.target.value)} className="w-16 rounded border px-2 py-0.5" />
                  <button className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white" onClick={() => { void after(api('/salaries/payday', { method: 'PUT', json: { day: Number(paydayEdit) } })); setPaydayEdit(null) }}>Kaydet</button>
                  <button className="text-xs text-gray-500" onClick={() => setPaydayEdit(null)}>İptal</button>
                </span>
              )
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">‹</button>
          <span className="w-32 text-center text-sm font-semibold">{monthLabel}</span>
          <button onClick={next} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">›</button>
          <Link href="/personel" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">Personel / maaş tanımla</Link>
        </div>
      </div>

      {msg && <div className="flex justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{msg}<button onClick={() => setMsg('')}>✕</button></div>}

      {sheet && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-3 text-center"><div className="text-lg font-bold">{fmt(sheet.totals.net)} ₺</div><div className="text-xs text-gray-500">Toplam net maaş</div></div>
          <div className="rounded-xl border bg-white p-3 text-center"><div className="text-lg font-bold text-amber-700">{fmt(sheet.totals.advances)} ₺</div><div className="text-xs text-gray-500">Verilen avans</div></div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center"><div className="text-lg font-bold text-orange-700">{fmt(sheet.totals.payable)} ₺</div><div className="text-xs text-gray-500">Ödenecek (kalan)</div></div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center"><div className="text-lg font-bold text-green-700">{fmt(sheet.totals.paid)} ₺</div><div className="text-xs text-gray-500">Ödenen</div></div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-400">Yükleniyor…</div>
      ) : !sheet || sheet.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-500">
          Bu ay çalışan personel yok. <Link href="/personel" className="text-blue-600 underline">Personel Özlük Dosyası</Link>&apos;ndan personel ve net maaş ekleyin.
        </div>
      ) : (
        <div className="space-y-2">
          {sheet.rows.map((r) => (
            <div key={r.employeeId} className={`rounded-xl border bg-white p-4 ${overdue(r) ? 'border-red-300 bg-red-50/40' : ''}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[180px] flex-1">
                  <div className="font-semibold">{r.fullName}</div>
                  <div className="text-xs text-gray-500">{[r.position, r.iban ? `IBAN ${r.iban}` : null].filter(Boolean).join(' · ') || '—'}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-gray-500">Net {r.netSalary ? `${fmt(r.netSalary)} ₺` : <span className="text-red-500">tanımlı değil</span>}</div>
                  {r.advanceTotal > 0 && <div className="text-amber-700">− Avans {fmt(r.advanceTotal)} ₺</div>}
                  <div className="font-bold">{r.paidAt ? `Ödendi ${fmt(r.paidAmount ?? r.payable)} ₺` : `Ödenecek ${fmt(r.payable)} ₺`}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setAdvFor(r); setAdvForm({ date: todayIso(), amount: '', note: '' }) }} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">+ Avans</button>
                  {r.paidAt ? (
                    <button onClick={() => void after(api('/salaries/unpay', { method: 'POST', json: { employeeId: r.employeeId, year, month } }))} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">✓ Ödendi — Geri Al</button>
                  ) : (
                    <button onClick={() => setPayFor({ row: r, amount: String(r.payable), note: '' })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${overdue(r) ? 'bg-red-600 text-white' : 'border bg-white hover:bg-green-50'}`}>
                      {overdue(r) ? '⚠ Gecikti — Ödendi İşaretle' : 'Ödendi İşaretle'}
                    </button>
                  )}
                </div>
              </div>
              {r.advances.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.advances.map((a) => (
                    <span key={a.id} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                      {new Date(a.date).toLocaleDateString('tr-TR')} · {fmt(a.amount)} ₺{a.note ? ` · ${a.note}` : ''}
                      <button title="Avansı sil" onClick={() => { if (confirm('Avans silinsin mi?')) void after(api(`/salaries/advances/${a.id}`, { method: 'DELETE' })) }} className="ml-1 text-amber-600 hover:text-red-600">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {advFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold">Avans — {advFor.fullName}</h3><button onClick={() => setAdvFor(null)}>✕</button></div>
            <label className="block text-xs text-gray-600">Tarih<input type="date" value={advForm.date} onChange={(e) => setAdvForm((f) => ({ ...f, date: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            <label className="block text-xs text-gray-600">Tutar (₺)<input type="number" value={advForm.amount} onChange={(e) => setAdvForm((f) => ({ ...f, amount: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-semibold" /></label>
            <label className="block text-xs text-gray-600">Not<input value={advForm.note} onChange={(e) => setAdvForm((f) => ({ ...f, note: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            <p className="text-xs text-gray-500">Avans, tarihinin düştüğü ayın maaşından düşülür.</p>
            <button
              disabled={!(Number(advForm.amount) > 0)}
              onClick={() => { void after(api('/salaries/advances', { method: 'POST', json: { employeeId: advFor.employeeId, date: advForm.date, amount: Number(advForm.amount), note: advForm.note } })); setAdvFor(null) }}
              className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Avansı Kaydet
            </button>
          </div>
        </div>
      )}

      {payFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold">Maaş ödendi — {payFor.row.fullName}</h3><button onClick={() => setPayFor(null)}>✕</button></div>
            <div className="text-sm text-gray-600">{monthLabel} · Net {fmt(payFor.row.netSalary)} ₺{payFor.row.advanceTotal > 0 ? ` − avans ${fmt(payFor.row.advanceTotal)} ₺` : ''}</div>
            <label className="block text-xs text-gray-600">Ödenen tutar (₺)<input type="number" value={payFor.amount} onChange={(e) => setPayFor((p) => p && ({ ...p, amount: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-semibold" /></label>
            <label className="block text-xs text-gray-600">Not<input value={payFor.note} onChange={(e) => setPayFor((p) => p && ({ ...p, note: e.target.value }))} placeholder="ör. EFT ile, prim dahil" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            <button
              onClick={() => { void after(api('/salaries/pay', { method: 'POST', json: { employeeId: payFor.row.employeeId, year, month, amount: Number(payFor.amount) || null, note: payFor.note || null } })); setPayFor(null) }}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white"
            >
              Ödendi Olarak Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
