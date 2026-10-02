'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { AdminShell } from '@/components/AdminShell'

type BillPayment = {
  year: number
  month: number
  paidAt: string | null
  amount: number | null
  note: string | null
}

type BillAccount = {
  id: number
  type: string
  name: string
  dueDay: number
  statementDay: number | null
  estimatedAmount: number | null
  sortOrder: number
  payments: BillPayment[]
}

const TYPE_LABELS: Record<string, string> = {
  RENT: 'Kira',
  WATER: 'Su',
  ELECTRICITY: 'Elektrik',
  MOBILE: 'Cep Telefonu',
  INTERNET: 'İnternet',
  CREDIT_CARD: 'Kredi Kartı',
}

const TYPE_COLORS: Record<string, string> = {
  RENT: 'bg-purple-50 border-purple-200',
  WATER: 'bg-blue-50 border-blue-200',
  ELECTRICITY: 'bg-yellow-50 border-yellow-200',
  MOBILE: 'bg-green-50 border-green-200',
  INTERNET: 'bg-cyan-50 border-cyan-200',
  CREDIT_CARD: 'bg-red-50 border-red-200',
}

const TYPE_BADGE: Record<string, string> = {
  RENT: 'bg-purple-100 text-purple-700',
  WATER: 'bg-blue-100 text-blue-700',
  ELECTRICITY: 'bg-yellow-100 text-yellow-800',
  MOBILE: 'bg-green-100 text-green-700',
  INTERNET: 'bg-cyan-100 text-cyan-700',
  CREDIT_CARD: 'bg-red-100 text-red-700',
}

const TYPES = ['RENT', 'WATER', 'ELECTRICITY', 'MOBILE', 'INTERNET', 'CREDIT_CARD']

function ordinalDay(day: number) {
  return `Her ayın ${day}.`
}

function getStatus(account: BillAccount, year: number, month: number) {
  const payment = account.payments.find(p => p.year === year && p.month === month)
  if (payment?.paidAt) return 'paid'
  const today = new Date()
  const due = new Date(year, month - 1, account.dueDay)
  if (due < today) return 'overdue'
  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff <= 7) return 'soon'
  return 'upcoming'
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Ödendi</span>
  if (status === 'overdue') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium animate-pulse">⚠ Gecikti</span>
  if (status === 'soon') return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">⏰ Bu hafta</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Bekliyor</span>
}

export default function FaturalarPage() {
  const [accounts, setAccounts] = useState<BillAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [paying, setPaying] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  const [form, setForm] = useState({ type: 'RENT', name: '', dueDay: 1, statementDay: '', estimatedAmount: '' })

  const load = useCallback(async () => {
    try {
      const data = await api<BillAccount[]>('/bill-accounts')
      setAccounts(data)
    } catch { setMsg('Yüklenemedi') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.name || !form.dueDay) { setMsg('Ad ve son ödeme günü zorunlu'); return }
    try {
      await api('/bill-accounts', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          name: form.name,
          dueDay: Number(form.dueDay),
          statementDay: form.statementDay ? Number(form.statementDay) : undefined,
          estimatedAmount: form.estimatedAmount ? Number(form.estimatedAmount) : undefined,
        }),
      })
      setShowAdd(false)
      setForm({ type: 'RENT', name: '', dueDay: 1, statementDay: '', estimatedAmount: '' })
      setMsg('Eklendi')
      load()
    } catch { setMsg('Eklenemedi') }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bu hesabı silmek istediğinizden emin misiniz?')) return
    try {
      await api(`/bill-accounts/${id}`, { method: 'DELETE' })
      load()
    } catch { setMsg('Silinemedi') }
  }

  async function togglePay(accountId: number) {
    setPaying(accountId)
    try {
      await api(`/bill-accounts/${accountId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ year: viewYear, month: viewMonth }),
      })
      load()
    } catch { setMsg('İşlem başarısız') }
    finally { setPaying(null) }
  }

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  const grouped = TYPES.reduce<Record<string, BillAccount[]>>((acc, t) => {
    acc[t] = accounts.filter(a => a.type === t)
    return acc
  }, {})

  const totalEstimated = accounts.reduce((s, a) => s + (a.estimatedAmount ? Number(a.estimatedAmount) : 0), 0)
  const paidCount = accounts.filter(a => {
    const p = a.payments.find(p => p.year === viewYear && p.month === viewMonth)
    return p?.paidAt
  }).length
  const overdueCount = accounts.filter(a => getStatus(a, viewYear, viewMonth) === 'overdue').length

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <AdminShell title="Fatura & Ödeme Takibi">
      <div className="p-4 max-w-6xl mx-auto">
        {/* Başlık + ay navigasyonu */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold">Fatura & Ödeme Takibi</h1>
            <p className="text-sm text-gray-500 mt-0.5">{accounts.length} hesap • {paidCount}/{accounts.length} ödendi</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">‹</button>
            <span className="font-semibold text-sm w-36 text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">›</button>
            <button onClick={() => setShowAdd(true)} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 ml-2">+ Ekle</button>
          </div>
        </div>

        {/* Özet kartları */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{totalEstimated.toLocaleString('tr-TR')} ₺</div>
            <div className="text-xs text-gray-500 mt-1">Tahmini Aylık Toplam</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{paidCount}</div>
            <div className="text-xs text-gray-500 mt-1">Ödenen ({monthLabel})</div>
          </div>
          <div className={`${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueCount}</div>
            <div className="text-xs text-gray-500 mt-1">Geciken Ödeme</div>
          </div>
        </div>

        {msg && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex justify-between">
            {msg}<button onClick={() => setMsg('')}>✕</button>
          </div>
        )}

        {/* Form */}
        {showAdd && (
          <div className="mb-5 p-4 border rounded-xl bg-gray-50">
            <h2 className="font-semibold mb-3">Yeni Hesap Ekle</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
              <input placeholder="Hesap adı (ör: Mağaza Kirası)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Son ödeme günü (1-31)" min={1} max={31} value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: Number(e.target.value) }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Hesap kesim günü (sadece kredi kartı)" min={1} max={31} value={form.statementDay} onChange={e => setForm(f => ({ ...f, statementDay: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Tahmini tutar (₺)" value={form.estimatedAmount} onChange={e => setForm(f => ({ ...f, estimatedAmount: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Ekle</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">İptal</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Yükleniyor…</div>
        ) : (
          <div className="space-y-5">
            {TYPES.map(type => {
              const group = grouped[type]
              if (group.length === 0) return null
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[type]}`}>{TYPE_LABELS[type]}</span>
                    <span className="text-xs text-gray-400">{group.length} hesap</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.map(account => {
                      const status = getStatus(account, viewYear, viewMonth)
                      const isPaid = status === 'paid'
                      return (
                        <div key={account.id} className={`border rounded-xl p-4 ${TYPE_COLORS[account.type]} relative`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{account.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {account.type === 'CREDIT_CARD' && account.statementDay
                                  ? `Kesim: ${account.statementDay}. • Son ödeme: ${account.dueDay}.`
                                  : ordinalDay(account.dueDay)}
                              </div>
                              {account.estimatedAmount && (
                                <div className="text-xs text-gray-600 mt-0.5 font-medium">
                                  ~{Number(account.estimatedAmount).toLocaleString('tr-TR')} ₺
                                </div>
                              )}
                            </div>
                            <StatusBadge status={status} />
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <button
                              onClick={() => togglePay(account.id)}
                              disabled={paying === account.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isPaid
                                  ? 'bg-green-600 text-white hover:bg-red-500'
                                  : 'bg-white border hover:bg-green-50 text-gray-700'
                              }`}
                            >
                              {paying === account.id ? '…' : isPaid ? '✓ Ödendi — Geri Al' : 'Ödendi İşaretle'}
                            </button>
                            <button onClick={() => handleDelete(account.id)} className="text-gray-300 hover:text-red-400 text-sm px-1">✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {accounts.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">Henüz hesap eklenmedi</p>
                <p className="text-sm mt-1">Sağ üstteki "Ekle" butonunu kullanın</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
