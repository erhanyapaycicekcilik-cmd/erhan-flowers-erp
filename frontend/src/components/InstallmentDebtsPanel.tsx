'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'

type Installment = {
  id: number
  no: number
  dueDate: string
  amount: number | string
  paidAt: string | null
  paidAmount: number | string | null
  note: string | null
}

type InstallmentDebt = {
  id: number
  title: string
  creditor: string | null
  supplier: { id: number; name: string } | null
  totalAmount: number | string
  installmentCount: number
  startDate: string
  documentNo: string | null
  notes: string | null
  isClosed: boolean
  installments: Installment[]
  paidAmount: number
  remainingAmount: number
  paidCount: number
  overdueCount: number
  nextInstallment: Installment | null
}

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { timeZone: 'UTC' })
const todayIso = () => new Date().toISOString().slice(0, 10)

function addMonths(iso: string, k: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const last = new Date(Date.UTC(y, m - 1 + k + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m - 1 + k, Math.min(d, last))).toISOString().slice(0, 10)
}

export function InstallmentDebtsPanel({ suppliers, onChange }: { suppliers: { id: number; name: string }[]; onChange?: () => void }) {
  const [debts, setDebts] = useState<InstallmentDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showClosed, setShowClosed] = useState(false)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', creditor: '', supplierId: '', totalAmount: '', installmentCount: '3', startDate: todayIso(), documentNo: '', notes: '' })
  const [instEdit, setInstEdit] = useState<{ id: number; amount: string; dueDate: string } | null>(null)

  const load = useCallback(async () => {
    try { setDebts(await api<InstallmentDebt[]>('/installment-debts')) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const refresh = async () => { await load(); onChange?.() }

  const preview = useMemo(() => {
    const total = Number(form.totalAmount)
    const count = Math.floor(Number(form.installmentCount))
    if (!(total > 0) || !(count >= 1) || count > 120 || !form.startDate) return null
    const per = Math.round((total / count) * 100) / 100
    const last = Math.round((total - per * (count - 1)) * 100) / 100
    return { per, last, count, end: addMonths(form.startDate, count - 1) }
  }, [form.totalAmount, form.installmentCount, form.startDate])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await api('/installment-debts', {
        method: 'POST',
        json: {
          title: form.title,
          creditor: form.creditor || undefined,
          supplierId: form.supplierId ? Number(form.supplierId) : null,
          totalAmount: Number(form.totalAmount),
          installmentCount: Number(form.installmentCount),
          startDate: form.startDate,
          documentNo: form.documentNo || undefined,
          notes: form.notes || undefined,
        },
      })
      setModal(false)
      setForm({ title: '', creditor: '', supplierId: '', totalAmount: '', installmentCount: '3', startDate: todayIso(), documentNo: '', notes: '' })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally { setSaving(false) }
  }

  const togglePay = async (inst: Installment) => {
    if (inst.paidAt && !confirm('Ödeme geri alınsın mı?')) return
    await api(`/installment-debts/installments/${inst.id}/pay`, { method: 'POST', json: {} })
    await refresh()
  }

  const saveInst = async () => {
    if (!instEdit) return
    await api(`/installment-debts/installments/${instEdit.id}`, { method: 'PUT', json: { amount: Number(instEdit.amount), dueDate: instEdit.dueDate } })
    setInstEdit(null)
    await refresh()
  }

  const remove = async (id: number) => {
    if (!confirm('Bu taksitli borcu ve tüm taksitlerini silmek istiyor musunuz?')) return
    await api(`/installment-debts/${id}`, { method: 'DELETE' })
    await refresh()
  }

  const list = debts.filter(d => showClosed || !d.isClosed)
  const totalRemaining = debts.reduce((s, d) => s + d.remainingAmount, 0)
  const today = new Date(); today.setUTCHours(0, 0, 0, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold">Taksitli Borçlar</h2>
          <p className="text-sm text-gray-500">Kalan toplam: <b className="text-red-600">{fmt(totalRemaining)} ₺</b> • {debts.filter(d => !d.isClosed).length} açık borç</p>
        </div>
        <label className="text-sm text-gray-600 flex items-center gap-1">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} /> Kapananları göster
        </label>
        <button onClick={() => setModal(true)} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <Plus size={16} /> Taksitli Borç Ekle
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Yükleniyor...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-gray-400">Taksitli borç yok.</div>
      ) : (
        list.map(d => {
          const pct = d.installments.length ? Math.round((d.paidCount / d.installments.length) * 100) : 0
          return (
            <div key={d.id} className={`border rounded-xl bg-white overflow-hidden ${d.isClosed ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                <span className="text-gray-400">{expanded === d.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                    {d.title}
                    {d.documentNo && <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{d.documentNo}</span>}
                    {d.overdueCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{d.overdueCount} gecikmiş taksit</span>}
                    {d.isClosed && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Kapandı</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {d.supplier?.name ?? d.creditor ?? '—'} • {d.paidCount}/{d.installments.length} taksit ödendi
                    {d.nextInstallment && <> • Sonraki: <b>{fmtDate(d.nextInstallment.dueDate)}</b> ({fmt(Number(d.nextInstallment.amount))} ₺)</>}
                  </div>
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                    <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Kalan / Toplam</div>
                  <div className="font-bold text-red-600">{fmt(d.remainingAmount)} ₺ <span className="text-gray-400 font-normal text-sm">/ {fmt(Number(d.totalAmount))} ₺</span></div>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(d.id) }} className="text-gray-300 hover:text-red-500 p-1.5"><Trash2 size={16} /></button>
              </div>

              {expanded === d.id && (
                <div className="border-t">
                  {d.notes && <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">{d.notes}</div>}
                  <div className="divide-y">
                    {d.installments.map(i => {
                      const overdue = !i.paidAt && new Date(i.dueDate) < today
                      return (
                        <div key={i.id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm ${overdue ? 'bg-red-50' : ''}`}>
                          <span className="w-12 text-gray-500">{i.no}. taksit</span>
                          {instEdit?.id === i.id ? (
                            <>
                              <input type="date" className="border rounded px-2 py-1 text-sm" value={instEdit.dueDate} onChange={e => setInstEdit(x => x && ({ ...x, dueDate: e.target.value }))} />
                              <input type="number" className="border rounded px-2 py-1 text-sm w-28" value={instEdit.amount} onChange={e => setInstEdit(x => x && ({ ...x, amount: e.target.value }))} />
                              <button onClick={saveInst} className="px-2 py-1 rounded bg-blue-600 text-white text-xs">Kaydet</button>
                              <button onClick={() => setInstEdit(null)} className="text-gray-400"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <span className={`w-24 flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}><CalendarClock size={13} />{fmtDate(i.dueDate)}</span>
                              <span className="w-28 font-semibold">{fmt(Number(i.amount))} ₺</span>
                              <span className="flex-1 text-xs text-gray-500">
                                {i.paidAt ? `Ödendi: ${new Date(i.paidAt).toLocaleDateString('tr-TR')}${i.paidAmount && Number(i.paidAmount) !== Number(i.amount) ? ` (${fmt(Number(i.paidAmount))} ₺)` : ''}` : overdue ? 'Gecikti' : ''}
                              </span>
                              {!i.paidAt && (
                                <button onClick={() => setInstEdit({ id: i.id, amount: String(i.amount), dueDate: i.dueDate.slice(0, 10) })} className="text-gray-400 hover:text-gray-700 p-1" title="Tutar / tarih düzelt"><Pencil size={13} /></button>
                              )}
                              <button
                                onClick={() => togglePay(i)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium ${i.paidAt ? 'bg-green-600 text-white hover:bg-red-500' : 'border bg-white hover:bg-green-50'}`}
                              >
                                {i.paidAt ? '✓ Ödendi' : 'Ödendi İşaretle'}
                              </button>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Taksitli Borç Ekle</h3>
              <button onClick={() => setModal(false)}><X size={20} /></button>
            </div>
            <label className="block text-xs font-semibold text-gray-600">Borç adı *
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" placeholder="ör: Saksı alımı Eylül, Kredi kartı taksiti, Araç kredisi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-gray-600">Tedarikçi
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
                  <option value="">— Yok —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-gray-600">veya Alacaklı
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" placeholder="Banka, kişi…" value={form.creditor} onChange={e => setForm(f => ({ ...f, creditor: e.target.value }))} />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs font-semibold text-gray-600">Toplam tutar (₺) *
                <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-semibold" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} />
              </label>
              <label className="block text-xs font-semibold text-gray-600">Taksit sayısı *
                <input type="number" min={1} max={120} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.installmentCount} onChange={e => setForm(f => ({ ...f, installmentCount: e.target.value }))} />
              </label>
              <label className="block text-xs font-semibold text-gray-600">İlk taksit tarihi *
                <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </label>
            </div>
            {preview && (
              <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-2">
                {preview.count} × {fmt(preview.per)} ₺{preview.last !== preview.per ? ` (son taksit ${fmt(preview.last)} ₺)` : ''} — her ay, son taksit {fmtDate(preview.end)}. Taksit tutarları sonradan tek tek düzeltilebilir.
              </div>
            )}
            <label className="block text-xs font-semibold text-gray-600">Belge / Fatura No
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={form.documentNo} onChange={e => setForm(f => ({ ...f, documentNo: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-gray-600">Not
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </label>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button onClick={save} disabled={saving || !form.title.trim() || !preview} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold text-sm">
              {saving ? 'Kaydediliyor...' : 'Taksitleri Oluştur'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
