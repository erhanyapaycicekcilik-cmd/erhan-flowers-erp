'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, CalendarClock, ChevronDown, ChevronRight, CreditCard, Landmark, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'

type Kind = 'CREDIT_CARD' | 'LOAN' | 'OVERDRAFT' | 'OTHER'

type Statement = {
  id: number
  year: number
  month: number
  statementDate: string | null
  dueDate: string
  totalAmount: number
  minimumPayment: number | null
  paidAt: string | null
  paidAmount: number | null
  source: string
  note: string | null
  overdue: boolean
}

type Account = {
  id: number
  kind: Kind
  bankName: string
  name: string
  accountNo: string | null
  creditLimit: number | null
  currentDebt: number | null
  currentDebtAt: string | null
  statementDay: number | null
  dueDay: number
  monthlyPayment: number | null
  endDate: string | null
  interestRate: number | null
  notes: string | null
  isActive: boolean
  statements: Statement[]
  availableLimit: number | null
  usagePercent: number | null
  unpaidTotal: number
  overdueCount: number
  nextDueDate: string
  remainingInstallments: number | null
  remainingLoanEstimate: number | null
}

type ListResponse = {
  accounts: Account[]
  totals: { currentDebt: number; creditLimit: number; unpaidStatements: number; overdueCount: number }
}

type SmsLog = { at: string; from: string | null; matched: string; text: string; result: string }

const KIND_LABEL: Record<Kind, string> = { CREDIT_CARD: 'Kredi Kartı', LOAN: 'Kredi', OVERDRAFT: 'KMH / Ek Hesap', OTHER: 'Diğer' }
const BANKS = ['Garanti BBVA', 'Yapı Kredi', 'Akbank', 'İş Bankası', 'Ziraat Bankası', 'Halkbank', 'VakıfBank', 'QNB', 'DenizBank', 'TEB', 'ING', 'Enpara', 'Kuveyt Türk', 'Şekerbank', 'Fibabanka']

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { timeZone: 'UTC' })
const todayIso = () => new Date().toISOString().slice(0, 10)
/** "12.345,67" / "12345,67" / "12345.67" → sayı; boş → null */
const numOrNull = (s: string) => {
  const t = s.trim().replace(/\s|₺|tl/gi, '')
  if (!t) return null
  return Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
}

/** Bugünden sonraki ilk `day`. gün (son ödeme tarihi önerisi) */
function nextDayIso(day: number) {
  const n = new Date()
  const mk = (y: number, m: number) => {
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
    return new Date(Date.UTC(y, m, Math.min(day, last)))
  }
  let d = mk(n.getFullYear(), n.getMonth())
  if (d.toISOString().slice(0, 10) < todayIso()) d = mk(n.getFullYear(), n.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

const emptyAccount = { kind: 'CREDIT_CARD' as Kind, bankName: '', name: '', accountNo: '', creditLimit: '', currentDebt: '', statementDay: '', dueDay: '', monthlyPayment: '', endDate: '', interestRate: '', notes: '' }

export function BankDebtsPanel({ onChange }: { onChange?: () => void }) {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [accModal, setAccModal] = useState<{ id: number | null; form: typeof emptyAccount } | null>(null)
  const [stmtModal, setStmtModal] = useState<{ account: Account; id: number | null; statementDate: string; dueDate: string; totalAmount: string; minimumPayment: string; note: string } | null>(null)
  const [debtEdit, setDebtEdit] = useState<{ id: number; value: string } | null>(null)
  const [smsOpen, setSmsOpen] = useState(false)
  const [smsLog, setSmsLog] = useState<SmsLog[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try { setData(await api<ListResponse>('/bank-debts')) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Yüklenemedi') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const run = async (p: Promise<unknown>) => {
    setMsg('')
    try { await p; await load(); onChange?.(); return true }
    catch (e) { setMsg(e instanceof Error ? e.message : 'İşlem başarısız'); return false }
  }

  const openNew = () => setAccModal({ id: null, form: { ...emptyAccount } })
  const openEdit = (a: Account) => setAccModal({
    id: a.id,
    form: {
      kind: a.kind, bankName: a.bankName, name: a.name, accountNo: a.accountNo ?? '',
      creditLimit: a.creditLimit != null ? String(a.creditLimit) : '', currentDebt: a.currentDebt != null ? String(a.currentDebt) : '',
      statementDay: a.statementDay != null ? String(a.statementDay) : '', dueDay: String(a.dueDay),
      monthlyPayment: a.monthlyPayment != null ? String(a.monthlyPayment) : '', endDate: a.endDate?.slice(0, 10) ?? '',
      interestRate: a.interestRate != null ? String(a.interestRate) : '', notes: a.notes ?? '',
    },
  })

  const saveAccount = async () => {
    if (!accModal) return
    const f = accModal.form
    const body = {
      kind: f.kind, bankName: f.bankName, name: f.name, accountNo: f.accountNo,
      creditLimit: numOrNull(f.creditLimit), currentDebt: numOrNull(f.currentDebt),
      statementDay: numOrNull(f.statementDay), dueDay: Number(f.dueDay),
      monthlyPayment: numOrNull(f.monthlyPayment), endDate: f.endDate || null,
      interestRate: numOrNull(f.interestRate), notes: f.notes,
    }
    setSaving(true)
    const ok = await run(accModal.id ? api(`/bank-debts/${accModal.id}`, { method: 'PUT', json: body }) : api('/bank-debts', { method: 'POST', json: body }))
    setSaving(false)
    if (ok) setAccModal(null)
  }

  const openStatement = (a: Account, s?: Statement) => setStmtModal(s
    ? { account: a, id: s.id, statementDate: s.statementDate?.slice(0, 10) ?? '', dueDate: s.dueDate.slice(0, 10), totalAmount: String(s.totalAmount), minimumPayment: s.minimumPayment != null ? String(s.minimumPayment) : '', note: s.note ?? '' }
    : { account: a, id: null, statementDate: '', dueDate: nextDayIso(a.dueDay), totalAmount: a.kind === 'LOAN' && a.monthlyPayment ? String(a.monthlyPayment) : '', minimumPayment: '', note: '' })

  const saveStatement = async () => {
    if (!stmtModal) return
    const body = {
      statementDate: stmtModal.statementDate || null,
      dueDate: stmtModal.dueDate,
      totalAmount: numOrNull(stmtModal.totalAmount),
      minimumPayment: numOrNull(stmtModal.minimumPayment),
      note: stmtModal.note,
    }
    setSaving(true)
    const ok = await run(stmtModal.id
      ? api(`/bank-debts/statements/${stmtModal.id}`, { method: 'PUT', json: body })
      : api(`/bank-debts/${stmtModal.account.id}/statements`, { method: 'POST', json: body }))
    setSaving(false)
    if (ok) setStmtModal(null)
  }

  const togglePay = async (s: Statement) => {
    if (s.paidAt) {
      if (!confirm('Ödeme geri alınsın mı?')) return
      await run(api(`/bank-debts/statements/${s.id}/pay`, { method: 'POST', json: {} }))
      return
    }
    const input = prompt(`Ödenen tutar (₺) — dönem borcu ${fmt(s.totalAmount)}${s.minimumPayment != null ? `, asgari ${fmt(s.minimumPayment)}` : ''}`, String(s.totalAmount))
    if (input === null) return
    await run(api(`/bank-debts/statements/${s.id}/pay`, { method: 'POST', json: { amount: numOrNull(input) ?? undefined } }))
  }

  const saveDebt = async () => {
    if (!debtEdit) return
    const ok = await run(api(`/bank-debts/${debtEdit.id}`, { method: 'PUT', json: { currentDebt: numOrNull(debtEdit.value) } }))
    if (ok) setDebtEdit(null)
  }

  const openSms = async () => {
    setSmsOpen(true)
    try { setSmsLog(await api<SmsLog[]>('/bank-debts/sms-log')) } catch { setSmsLog([]) }
  }

  const accounts = data?.accounts ?? []
  const totals = data?.totals
  const setF = (patch: Partial<typeof emptyAccount>) => setAccModal(m => m && ({ ...m, form: { ...m.form, ...patch } }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-lg font-bold flex items-center gap-2"><Landmark size={20} /> Banka Borçları</h2>
          <p className="text-sm text-gray-500">Kredi kartı, kredi ve ek hesaplar: hesap kesim, son ödeme, dönem borcu ve asgari ödeme</p>
        </div>
        <button onClick={openSms} className="flex items-center gap-1 border bg-white hover:bg-gray-50 rounded-lg px-3 py-2 text-sm"><MessageSquare size={16} /> Banka SMS&apos;leri</button>
        <button onClick={openNew} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold"><Plus size={16} /> Kart / Kredi Ekle</button>
      </div>

      {msg && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{msg}</div>}

      {totals && accounts.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-red-600 text-white rounded-xl p-4">
            <div className="text-xs opacity-80">Toplam banka borcu</div>
            <div className="text-xl font-bold">{fmt(totals.currentDebt)} ₺</div>
            <div className="text-[11px] opacity-80">kart güncel borç + kalan kredi</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs text-gray-500">Ödenecek ekstreler</div>
            <div className="text-lg font-bold text-gray-800">{fmt(totals.unpaidStatements)} ₺</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs text-gray-500">Toplam kart limiti</div>
            <div className="text-lg font-bold text-gray-800">{fmt(totals.creditLimit)} ₺</div>
          </div>
          <div className={`rounded-xl p-4 border ${totals.overdueCount ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
            <div className="text-xs text-gray-500">Gecikmiş ekstre</div>
            <div className={`text-lg font-bold ${totals.overdueCount ? 'text-red-600' : 'text-gray-400'}`}>{totals.overdueCount}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Yükleniyor...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white border rounded-xl">
          <CreditCard className="mx-auto mb-2 text-gray-300" size={36} />
          Henüz kart veya kredi eklenmedi. <button onClick={openNew} className="text-blue-600 font-semibold">Kart / Kredi Ekle</button>
        </div>
      ) : (
        accounts.map(a => {
          const Icon = a.kind === 'LOAN' ? Banknote : a.kind === 'CREDIT_CARD' ? CreditCard : Landmark
          const open = expanded === a.id
          const nextDue = new Date(a.nextDueDate)
          const daysLeft = Math.round((nextDue.getTime() - new Date(todayIso()).getTime()) / 86400000)
          return (
            <div key={a.id} className={`border rounded-xl bg-white overflow-hidden ${a.isActive ? '' : 'opacity-60'}`}>
              <div className="flex flex-wrap items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(open ? null : a.id)}>
                <span className="text-gray-400">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                <Icon size={22} className="text-blue-600 shrink-0" />
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                    {a.bankName} — {a.name}
                    {a.accountNo && <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{a.accountNo.length <= 4 ? `**** ${a.accountNo}` : a.accountNo}</span>}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{KIND_LABEL[a.kind]}</span>
                    {a.overdueCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{a.overdueCount} gecikmiş</span>}
                    {!a.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Pasif</span>}
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                    {a.statementDay && <span>Hesap kesim: her ayın {a.statementDay}&apos;i</span>}
                    <span>Son ödeme: her ayın {a.dueDay}&apos;i</span>
                    <span className={daysLeft < 0 ? 'text-red-600 font-semibold' : daysLeft <= 3 ? 'text-orange-600 font-semibold' : ''}>
                      Sıradaki: {fmtDate(a.nextDueDate)} ({daysLeft < 0 ? `${-daysLeft} gün gecikti` : daysLeft === 0 ? 'bugün' : `${daysLeft} gün`})
                    </span>
                    {a.kind === 'LOAN' && a.monthlyPayment != null && <span>Taksit: {fmt(a.monthlyPayment)} ₺{a.remainingInstallments != null ? ` × ${a.remainingInstallments} kaldı` : ''}</span>}
                  </div>
                  {a.usagePercent != null && (
                    <div className="mt-1.5 flex items-center gap-2 max-w-sm">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${a.usagePercent > 85 ? 'bg-red-500' : a.usagePercent > 60 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${Math.min(100, a.usagePercent)}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-500">%{a.usagePercent} kullanıldı</span>
                    </div>
                  )}
                </div>
                <div className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="text-xs text-gray-500">{a.kind === 'LOAN' ? 'Kalan kredi' : 'Güncel borç'}</div>
                  {debtEdit?.id === a.id ? (
                    <div className="flex items-center gap-1">
                      <input autoFocus className="border rounded px-2 py-1 text-sm w-28 text-right" value={debtEdit.value} onChange={e => setDebtEdit({ id: a.id, value: e.target.value })} onKeyDown={e => e.key === 'Enter' && saveDebt()} />
                      <button onClick={saveDebt} className="px-2 py-1 rounded bg-blue-600 text-white text-xs">Kaydet</button>
                      <button onClick={() => setDebtEdit(null)} className="text-gray-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDebtEdit({ id: a.id, value: a.currentDebt != null ? String(a.currentDebt) : '' })} className="font-bold text-red-600 hover:underline" title="Güncel borcu düzelt">
                      {a.currentDebt != null ? `${fmt(a.currentDebt)} ₺` : a.remainingLoanEstimate != null ? `~${fmt(a.remainingLoanEstimate)} ₺` : 'Gir'}
                    </button>
                  )}
                  {a.availableLimit != null && <div className="text-[11px] text-gray-500">Kullanılabilir: {fmt(a.availableLimit)} ₺ / {fmt(a.creditLimit ?? 0)} ₺</div>}
                  {a.currentDebtAt && <div className="text-[10px] text-gray-400">{new Date(a.currentDebtAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</div>}
                </div>
              </div>

              {open && (
                <div className="border-t">
                  <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-50 text-sm">
                    <button onClick={() => openStatement(a)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                      <Plus size={14} /> {a.kind === 'LOAN' ? 'Taksit Gir' : 'Ekstre Gir'}
                    </button>
                    <button onClick={() => openEdit(a)} className="flex items-center gap-1 border bg-white rounded-lg px-3 py-1.5 text-xs"><Pencil size={13} /> Düzenle</button>
                    <button onClick={() => run(api(`/bank-debts/${a.id}`, { method: 'PUT', json: { isActive: !a.isActive } }))} className="border bg-white rounded-lg px-3 py-1.5 text-xs">{a.isActive ? 'Pasif yap (kapandı)' : 'Aktif yap'}</button>
                    <button onClick={() => confirm(`${a.bankName} — ${a.name} ve tüm ekstreleri silinsin mi?`) && run(api(`/bank-debts/${a.id}`, { method: 'DELETE' }))} className="ml-auto text-gray-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                  </div>
                  {a.notes && <div className="px-4 py-2 text-xs text-gray-500">{a.notes}</div>}
                  {a.statements.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-400">Henüz ekstre girilmedi. Ekstre gelince &quot;{a.kind === 'LOAN' ? 'Taksit Gir' : 'Ekstre Gir'}&quot; ile dönem borcunu ve son ödeme tarihini yazın.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-gray-500 bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Dönem</th>
                            <th className="text-left px-2 py-2 font-medium">Hesap kesim</th>
                            <th className="text-left px-2 py-2 font-medium">Son ödeme</th>
                            <th className="text-right px-2 py-2 font-medium">{a.kind === 'LOAN' ? 'Taksit' : 'Dönem borcu'}</th>
                            <th className="text-right px-2 py-2 font-medium">Asgari</th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {a.statements.map(s => (
                            <tr key={s.id} className={s.overdue ? 'bg-red-50' : ''}>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {new Date(Date.UTC(s.year, s.month - 1, 1)).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                                {s.source === 'SMS' && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700" title={s.note ?? ''}>SMS</span>}
                              </td>
                              <td className="px-2 py-2 text-gray-600">{s.statementDate ? fmtDate(s.statementDate) : '—'}</td>
                              <td className={`px-2 py-2 whitespace-nowrap ${s.overdue ? 'text-red-600 font-semibold' : ''}`}><CalendarClock size={12} className="inline mr-1" />{fmtDate(s.dueDate)}</td>
                              <td className="px-2 py-2 text-right font-semibold whitespace-nowrap">{fmt(s.totalAmount)} ₺</td>
                              <td className="px-2 py-2 text-right text-gray-600 whitespace-nowrap">{s.minimumPayment != null ? `${fmt(s.minimumPayment)} ₺` : '—'}</td>
                              <td className="px-2 py-2 text-right whitespace-nowrap">
                                {!s.paidAt && <button onClick={() => openStatement(a, s)} className="text-gray-400 hover:text-gray-700 p-1" title="Düzelt"><Pencil size={13} /></button>}
                                <button onClick={() => togglePay(s)} className={`px-3 py-1 rounded-lg text-xs font-medium ${s.paidAt ? 'bg-green-600 text-white hover:bg-red-500' : 'border bg-white hover:bg-green-50'}`} title={s.paidAt ? `Ödendi: ${new Date(s.paidAt).toLocaleDateString('tr-TR')}` : ''}>
                                  {s.paidAt ? `✓ ${s.paidAmount != null && s.paidAmount !== s.totalAmount ? `${fmt(s.paidAmount)} ₺ ödendi` : 'Ödendi'}` : 'Ödendi İşaretle'}
                                </button>
                                <button onClick={() => confirm('Bu ekstre silinsin mi?') && run(api(`/bank-debts/statements/${s.id}`, { method: 'DELETE' }))} className="text-gray-300 hover:text-red-500 p-1 ml-1"><Trash2 size={13} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {accModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{accModal.id ? 'Kart / Kredi Düzenle' : 'Kart / Kredi Ekle'}</h3>
              <button onClick={() => setAccModal(null)}><X size={20} /></button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(KIND_LABEL) as Kind[]).map(k => (
                <button key={k} onClick={() => setF({ kind: k })} className={`px-3 py-1.5 rounded-lg text-sm border ${accModal.form.kind === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>{KIND_LABEL[k]}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-gray-600">Banka *
                <input list="bank-names" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={accModal.form.bankName} onChange={e => setF({ bankName: e.target.value })} />
                <datalist id="bank-names">{BANKS.map(b => <option key={b} value={b} />)}</datalist>
              </label>
              <label className="block text-xs font-semibold text-gray-600">Ad
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" placeholder={accModal.form.kind === 'LOAN' ? 'İşletme kredisi' : 'Bonus Kart'} value={accModal.form.name} onChange={e => setF({ name: e.target.value })} />
              </label>
            </div>
            <label className="block text-xs font-semibold text-gray-600">{accModal.form.kind === 'CREDIT_CARD' ? 'Kartın son 4 hanesi' : 'Kredi / hesap no'}
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal font-mono" maxLength={accModal.form.kind === 'CREDIT_CARD' ? 4 : 30} value={accModal.form.accountNo} onChange={e => setF({ accountNo: e.target.value })} />
              <span className="font-normal text-gray-400">Banka SMS&apos;lerini bu karta eşleştirmek için. Kart numarasının tamamını girmeyin.</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {accModal.form.kind !== 'LOAN' && (
                <label className="block text-xs font-semibold text-gray-600">Hesap kesim günü
                  <input type="number" min={1} max={31} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" placeholder="ör. 15" value={accModal.form.statementDay} onChange={e => setF({ statementDay: e.target.value })} />
                </label>
              )}
              <label className="block text-xs font-semibold text-gray-600">{accModal.form.kind === 'LOAN' ? 'Taksit günü *' : 'Son ödeme günü *'}
                <input type="number" min={1} max={31} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" placeholder="ör. 25" value={accModal.form.dueDay} onChange={e => setF({ dueDay: e.target.value })} />
              </label>
            </div>
            {accModal.form.kind === 'LOAN' ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold text-gray-600">Aylık taksit (₺)
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={accModal.form.monthlyPayment} onChange={e => setF({ monthlyPayment: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold text-gray-600">Son taksit tarihi
                  <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={accModal.form.endDate} onChange={e => setF({ endDate: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold text-gray-600">Kalan anapara / borç (₺)
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" placeholder="boşsa taksit × kalan ay" value={accModal.form.currentDebt} onChange={e => setF({ currentDebt: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold text-gray-600">Aylık faiz (%)
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={accModal.form.interestRate} onChange={e => setF({ interestRate: e.target.value })} />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold text-gray-600">Limit (₺)
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={accModal.form.creditLimit} onChange={e => setF({ creditLimit: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold text-gray-600">Güncel toplam borç (₺)
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={accModal.form.currentDebt} onChange={e => setF({ currentDebt: e.target.value })} />
                </label>
              </div>
            )}
            <label className="block text-xs font-semibold text-gray-600">Not
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={accModal.form.notes} onChange={e => setF({ notes: e.target.value })} />
            </label>
            <button onClick={saveAccount} disabled={saving || !accModal.form.bankName.trim() || !accModal.form.dueDay} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold text-sm">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {stmtModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{stmtModal.account.kind === 'LOAN' ? 'Taksit' : 'Ekstre'} — {stmtModal.account.bankName} {stmtModal.account.name}</h3>
              <button onClick={() => setStmtModal(null)}><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {stmtModal.account.kind !== 'LOAN' && (
                <label className="block text-xs font-semibold text-gray-600">Hesap kesim tarihi
                  <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={stmtModal.statementDate} onChange={e => setStmtModal(m => m && ({ ...m, statementDate: e.target.value }))} />
                </label>
              )}
              <label className="block text-xs font-semibold text-gray-600">Son ödeme tarihi *
                <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={stmtModal.dueDate} onChange={e => setStmtModal(m => m && ({ ...m, dueDate: e.target.value }))} />
              </label>
              <label className="block text-xs font-semibold text-gray-600">{stmtModal.account.kind === 'LOAN' ? 'Taksit tutarı (₺) *' : 'Dönem borcu (₺) *'}
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-semibold" value={stmtModal.totalAmount} onChange={e => setStmtModal(m => m && ({ ...m, totalAmount: e.target.value }))} />
              </label>
              {stmtModal.account.kind !== 'LOAN' && (
                <label className="block text-xs font-semibold text-gray-600">Asgari ödeme (₺)
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={stmtModal.minimumPayment} onChange={e => setStmtModal(m => m && ({ ...m, minimumPayment: e.target.value }))} />
                </label>
              )}
            </div>
            <label className="block text-xs font-semibold text-gray-600">Not
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" value={stmtModal.note} onChange={e => setStmtModal(m => m && ({ ...m, note: e.target.value }))} />
            </label>
            <button onClick={saveStatement} disabled={saving || !stmtModal.dueDate || !stmtModal.totalAmount.trim()} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold text-sm">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {smsOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Banka SMS&apos;leri</h3>
              <button onClick={() => setSmsOpen(false)}><X size={20} /></button>
            </div>
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
              <p>Faturalar sekmesindeki <b>SMS adresi</b> (telefondaki SMS Forwarder / MacroDroid) banka SMS&apos;leri için de çalışır; ayrıca bir şey kurmanız gerekmez.</p>
              <p>• <b>Ekstre SMS&apos;i</b> (dönem borcu, asgari, son ödeme tarihi) → o ayın ekstresi otomatik yazılır.<br />
                • <b>Harcama SMS&apos;i</b> (&quot;kullanılabilir limitiniz …&quot;) → kartın güncel borcu = limit − kullanılabilir limit.<br />
                • <b>Kredi taksit SMS&apos;i</b> → o ayın taksiti.</p>
              <p>Eşleştirme kartın son 4 hanesiyle yapılır; yazmıyorsa o bankada tek kart varsa ona yazılır. Elle girdiğiniz veya ödediğiniz ekstreye dokunulmaz.</p>
            </div>
            {smsLog.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">Henüz işlenen banka SMS&apos;i yok.</div>
            ) : (
              <div className="divide-y border rounded-lg">
                {smsLog.map((l, i) => (
                  <div key={i} className="px-3 py-2 text-sm">
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>{new Date(l.at).toLocaleString('tr-TR')}</span>
                      {l.from && <span>{l.from}</span>}
                      <span className="font-semibold text-gray-700">{l.matched}</span>
                      <span className="text-green-700">{l.result}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{l.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
