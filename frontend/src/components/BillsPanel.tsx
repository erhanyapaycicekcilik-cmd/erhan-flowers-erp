'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Mail, MessageSquare, Pencil, RefreshCw } from 'lucide-react'
import { api, apiBaseUrl } from '@/lib/api'

type BillPayment = {
  year: number
  month: number
  paidAt: string | null
  amount: number | string | null
  note: string | null
  invoiceNo: string | null
  dueDate: string | null
  source: string | null
}

type BillAccount = {
  id: number
  type: string
  name: string
  dueDay: number
  statementDay: number | null
  estimatedAmount: number | string | null
  sortOrder: number
  provider: string | null
  subscriberNo: string | null
  emailSender: string | null
  createdAt: string
  payments: BillPayment[]
}

export const BILL_TYPE_LABELS: Record<string, string> = {
  RENT: 'Kira',
  WATER: 'Su',
  ELECTRICITY: 'Elektrik',
  NATURAL_GAS: 'Doğalgaz',
  MOBILE: 'Cep Telefonu',
  INTERNET: 'İnternet / Sabit Hat',
  CREDIT_CARD: 'Kredi Kartı',
  OTHER: 'Diğer',
}

const TYPE_COLORS: Record<string, string> = {
  RENT: 'bg-purple-50 border-purple-200',
  WATER: 'bg-blue-50 border-blue-200',
  ELECTRICITY: 'bg-yellow-50 border-yellow-200',
  NATURAL_GAS: 'bg-orange-50 border-orange-200',
  MOBILE: 'bg-green-50 border-green-200',
  INTERNET: 'bg-cyan-50 border-cyan-200',
  CREDIT_CARD: 'bg-red-50 border-red-200',
  OTHER: 'bg-gray-50 border-gray-200',
}

const TYPE_BADGE: Record<string, string> = {
  RENT: 'bg-purple-100 text-purple-700',
  WATER: 'bg-blue-100 text-blue-700',
  ELECTRICITY: 'bg-yellow-100 text-yellow-800',
  NATURAL_GAS: 'bg-orange-100 text-orange-700',
  MOBILE: 'bg-green-100 text-green-700',
  INTERNET: 'bg-cyan-100 text-cyan-700',
  CREDIT_CARD: 'bg-red-100 text-red-700',
  OTHER: 'bg-gray-100 text-gray-700',
}

const TYPES = Object.keys(BILL_TYPE_LABELS)
const UTILITY_TYPES = ['WATER', 'ELECTRICITY', 'NATURAL_GAS', 'MOBILE', 'INTERNET']

const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function getStatus(account: BillAccount, year: number, month: number) {
  const payment = account.payments.find(p => p.year === year && p.month === month)
  if (payment?.paidAt) return 'paid'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastDay = new Date(year, month, 0).getDate()
  const due = payment?.dueDate ? new Date(payment.dueDate) : new Date(year, month - 1, Math.min(account.dueDay, lastDay))
  if (due < today) return 'overdue'
  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff <= 7) return 'soon'
  return 'upcoming'
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">✓ Ödendi</span>
  if (status === 'overdue') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium animate-pulse whitespace-nowrap">⚠ Gecikti</span>
  if (status === 'soon') return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium whitespace-nowrap">⏰ Bu hafta</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">Bekliyor</span>
}

type Suggestion = { subscriberNo: string | null; type: string; provider: string | null }
type SmsLogEntry = { at: string; channel?: 'SMS' | 'EMAIL'; from: string | null; text: string; matched: string | null; amount: number | null; dueDate: string | null; result: string; suggestion?: Suggestion | null }

function SmsCard({ onReceived, onSuggest, knownNumbers }: { onReceived: () => void; onSuggest: (s: Suggestion) => void; knownNumbers: string[] }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<{ token: string; log: SmsLogEntry[] } | null>(null)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async (regenerate = false) => {
    try {
      setErr('')
      const r = await api<{ token: string; log: SmsLogEntry[] }>(regenerate ? '/bill-accounts/sms-settings/regenerate' : '/bill-accounts/sms-settings', { method: regenerate ? 'POST' : 'GET' })
      setData(r)
      onReceived()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Yüklenemedi') }
  }, [onReceived])

  useEffect(() => { if (!data) load() }, [data, load])

  const pending = (data?.log ?? []).filter(e => e.suggestion && !(e.suggestion.subscriberNo && knownNumbers.includes(e.suggestion.subscriberNo)))

  const url = data ? `${apiBaseUrl}/bill-accounts/sms-webhook?token=${data.token}` : ''

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* elle kopyalanır */ }
  }

  return (
    <div className="mb-4 rounded-xl border bg-white">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3 text-sm text-left">
        <MessageSquare size={18} className="text-purple-600" />
        <span className="flex-1"><b>Gelen fatura bildirimleri (SMS + e-posta)</b> — telefondaki tüm SMS&apos;ler ve Gmail taranır, faturalar ilgili aya yazılır</span>
        {pending.length > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{pending.length} yeni</span>}
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t p-3 space-y-3 text-sm">
          {err && <div className="text-red-600">{err}</div>}
          {data && (
            <>
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Telefondaki uygulamaya yapıştırılacak adres (gizli tutun):</div>
                <div className="flex gap-2">
                  <input readOnly value={url} onFocus={e => e.target.select()} className="flex-1 border rounded-lg px-2 py-1.5 font-mono text-xs bg-gray-50" />
                  <button onClick={copy} className="px-3 py-1.5 rounded-lg bg-purple-600 text-white flex items-center gap-1 text-xs"><Copy size={13} />{copied ? 'Kopyalandı' : 'Kopyala'}</button>
                </div>
                <button onClick={() => { if (confirm('Yeni adres oluşturulursa telefondaki eski adres çalışmaz. Devam?')) load(true) }} className="mt-1 text-xs text-gray-500 underline">Yeni adres oluştur</button>
              </div>
              <ol className="list-decimal pl-5 text-xs text-gray-600 space-y-1">
                <li>Play Store&apos;dan <b>&quot;SMS Forwarder&quot;</b> (veya MacroDroid) uygulamasını kurun, SMS izni verin.</li>
                <li>Yeni kural: <b>Webhook / URL</b> seçin, yukarıdaki adresi yapıştırın, yöntem <b>POST</b>, biçim <b>JSON</b>.</li>
                <li>Gövde: <code className="bg-gray-100 px-1 rounded">{'{"from":"%from%","text":"%text%"}'}</code> (uygulamadaki değişken adlarını kullanın).</li>
                <li>Gönderen filtresi: <b>tümü (*)</b>. Banka, şifre, kargo SMS&apos;leri ERP&apos;de hiç kaydedilmeden atılır.</li>
                <li>Kayıtlı hesabın numarası geçen SMS/e-posta → o ayın faturasına yazılır. Yeni bir abonelikten gelirse aşağıda <b>&quot;Hesap olarak ekle&quot;</b> çıkar.</li>
              </ol>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold text-gray-600">Son gelen fatura bildirimleri</div>
                  <button onClick={() => load()} className="text-xs text-blue-600">Yenile</button>
                </div>
                {data.log.length === 0 ? (
                  <div className="text-xs text-gray-400">Henüz SMS gelmedi.</div>
                ) : (
                  <div className="divide-y border rounded-lg max-h-64 overflow-y-auto">
                    {data.log.map((e, i) => (
                      <div key={i} className="p-2 text-xs">
                        <div className="flex flex-wrap gap-2 text-gray-500">
                          <span>{new Date(e.at).toLocaleString('tr-TR')}</span>
                          {e.from && <span>{e.from}</span>}
                          <span className={e.matched ? 'text-green-700 font-semibold' : 'text-red-600'}>{e.matched ?? 'eşleşmedi'}</span>
                          {e.amount != null && <span className="font-semibold text-gray-800">{fmt(e.amount)} ₺</span>}
                          <span className={`rounded px-1 ${e.channel === 'EMAIL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{e.channel === 'EMAIL' ? 'e-posta' : 'SMS'}</span>
                          <span>{e.result}</span>
                          {e.suggestion && !(e.suggestion.subscriberNo && knownNumbers.includes(e.suggestion.subscriberNo)) && (
                            <button onClick={() => onSuggest(e.suggestion!)} className="rounded bg-green-600 px-2 py-0.5 font-semibold text-white">+ Hesap olarak ekle</button>
                          )}
                        </div>
                        <div className="text-gray-700 mt-0.5 break-words">{e.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const emptyForm = { type: 'ELECTRICITY', name: '', provider: '', subscriberNo: '', emailSender: '', dueDay: '' as string | number, statementDay: '', estimatedAmount: '' }

export function BillsPanel() {
  const [accounts, setAccounts] = useState<BillAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [paying, setPaying] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [gmail, setGmail] = useState<{ connected: boolean } | null>(null)
  const [scanning, setScanning] = useState(false)

  // Aylık fatura girişi
  const [billEdit, setBillEdit] = useState<{ account: BillAccount; amount: string; invoiceNo: string; dueDate: string; note: string } | null>(null)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  const load = useCallback(async () => {
    try {
      const data = await api<BillAccount[]>('/bill-accounts')
      setAccounts(data)
    } catch { setMsg('Yüklenemedi') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    api<{ connected: boolean }>('/bill-accounts/gmail-status').then(setGmail).catch(() => setGmail(null))
  }, [load])

  function openNew() {
    setEditId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(a: BillAccount) {
    setEditId(a.id)
    setForm({
      type: a.type,
      name: a.name,
      provider: a.provider ?? '',
      subscriberNo: a.subscriberNo ?? '',
      emailSender: a.emailSender ?? '',
      dueDay: a.dueDay,
      statementDay: a.statementDay ? String(a.statementDay) : '',
      estimatedAmount: a.estimatedAmount != null ? String(a.estimatedAmount) : '',
    })
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.dueDay) { setMsg('Ad ve son ödeme günü zorunlu'); return }
    const payload = {
      type: form.type,
      name: form.name,
      provider: form.provider,
      subscriberNo: form.subscriberNo,
      emailSender: form.emailSender,
      dueDay: Number(form.dueDay),
      statementDay: form.statementDay ? Number(form.statementDay) : null,
      estimatedAmount: form.estimatedAmount ? Number(form.estimatedAmount) : null,
    }
    try {
      if (editId) await api(`/bill-accounts/${editId}`, { method: 'PUT', json: payload })
      else await api('/bill-accounts', { method: 'POST', json: payload })
      setFormOpen(false)
      setMsg(editId ? 'Güncellendi' : 'Eklendi — her ay otomatik olarak listede görünecek')
      load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Kaydedilemedi') }
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
      await api(`/bill-accounts/${accountId}/pay`, { method: 'POST', json: { year: viewYear, month: viewMonth } })
      load()
    } catch { setMsg('İşlem başarısız') }
    finally { setPaying(null) }
  }

  function openBill(a: BillAccount) {
    const p = a.payments.find(x => x.year === viewYear && x.month === viewMonth)
    setBillEdit({
      account: a,
      amount: p?.amount != null ? String(p.amount) : '',
      invoiceNo: p?.invoiceNo ?? '',
      dueDate: p?.dueDate ? p.dueDate.slice(0, 10) : '',
      note: p?.note ?? '',
    })
  }

  async function saveBill() {
    if (!billEdit) return
    try {
      await api(`/bill-accounts/${billEdit.account.id}/month`, {
        method: 'PUT',
        json: {
          year: viewYear,
          month: viewMonth,
          amount: billEdit.amount ? Number(billEdit.amount) : null,
          invoiceNo: billEdit.invoiceNo,
          dueDate: billEdit.dueDate || null,
          note: billEdit.note,
        },
      })
      setBillEdit(null)
      load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Kaydedilemedi') }
  }

  async function scanEmail() {
    setScanning(true)
    try {
      const r = await api<{ connected: boolean; scanned: number; updated: number; discovered?: number }>('/bill-accounts/scan-email', { method: 'POST' })
      if (!r.connected) setMsg('Gmail bağlı değil. Önce "Gmail\'i bağla" ile hesabınızı bağlayın.')
      else if (r.scanned === 0 && !r.discovered) setMsg('Abone/tesisat numarası girilmiş hesap yok. Hesabı düzenleyip abone numarasını girin.')
      else setMsg(`${r.scanned} hesap tarandı, ${r.updated} fatura e-postadan alındı${r.discovered ? `, ${r.discovered} yeni abonelik bulundu (aşağıdaki listeden ekleyin)` : ''}.`)
      load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Tarama başarısız') }
    finally { setScanning(false) }
  }

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  // Hesap o aydan sonra açıldıysa o ayda gösterme
  const monthEnd = new Date(viewYear, viewMonth, 0, 23, 59)
  const visible = accounts.filter(a => new Date(a.createdAt) <= monthEnd || a.payments.some(p => p.year === viewYear && p.month === viewMonth))

  const monthAmount = (a: BillAccount) => {
    const p = a.payments.find(x => x.year === viewYear && x.month === viewMonth)
    if (p?.amount != null) return { value: Number(p.amount), estimated: false }
    if (a.estimatedAmount != null) return { value: Number(a.estimatedAmount), estimated: true }
    return null
  }

  const totalMonth = visible.reduce((s, a) => s + (monthAmount(a)?.value ?? 0), 0)
  const unpaidMonth = visible.filter(a => getStatus(a, viewYear, viewMonth) !== 'paid').reduce((s, a) => s + (monthAmount(a)?.value ?? 0), 0)
  const paidCount = visible.filter(a => getStatus(a, viewYear, viewMonth) === 'paid').length
  const overdueCount = visible.filter(a => getStatus(a, viewYear, viewMonth) === 'overdue').length

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const isUtility = UTILITY_TYPES.includes(form.type)

  return (
    <div>
      {/* Başlık + ay navigasyonu */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold">Faturalar (Kira, Su, Elektrik, Telefon, İnternet…)</h2>
          <p className="text-sm text-gray-500 mt-0.5">{visible.length} hesap • {paidCount}/{visible.length} ödendi • her ay otomatik tekrar eder</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={prevMonth} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">‹</button>
          <span className="font-semibold text-sm w-32 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">›</button>
          <button onClick={openNew} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">+ Fatura Hesabı</button>
        </div>
      </div>

      {/* Gmail şeridi */}
      <div className="mb-4 p-3 rounded-xl border bg-white flex flex-wrap items-center gap-3 text-sm">
        <Mail size={18} className={gmail?.connected ? 'text-green-600' : 'text-gray-400'} />
        <div className="flex-1 min-w-[200px]">
          {gmail?.connected
            ? <span>Gmail bağlı — abone numarası girilen hesapların fatura e-postaları <b>her sabah</b> otomatik okunur (tutar, fatura no, son ödeme tarihi).</span>
            : <span className="text-gray-600">Faturaların otomatik gelmesi için Gmail&apos;i bağlayın ve kurumların e-fatura bildirimlerini bu e-postaya yönlendirin.</span>}
        </div>
        {!gmail?.connected && (
          <a href={`${apiBaseUrl}/integrations/gmail/auth`} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Gmail&apos;i bağla</a>
        )}
        <button onClick={scanEmail} disabled={scanning} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
          <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} /> {scanning ? 'Taranıyor…' : 'E-postadan şimdi çek'}
        </button>
      </div>

      <SmsCard
        onReceived={load}
        knownNumbers={accounts.flatMap(a => (a.subscriberNo ?? '').split(/[,;/]+/).map(x => x.replace(/\s+/g, '')).filter(Boolean))}
        onSuggest={sg => {
          setEditId(null)
          setForm({ ...emptyForm, type: sg.type, provider: sg.provider ?? '', subscriberNo: sg.subscriberNo ?? '', name: [sg.provider, BILL_TYPE_LABELS[sg.type]].filter(Boolean).join(' – ') })
          setFormOpen(true)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />

      {/* Özet kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-gray-800">{fmt(totalMonth)} ₺</div>
          <div className="text-xs text-gray-500 mt-1">{monthLabel} toplam</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-orange-700">{fmt(unpaidMonth)} ₺</div>
          <div className="text-xs text-gray-500 mt-1">Ödenmemiş</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-green-700">{paidCount}</div>
          <div className="text-xs text-gray-500 mt-1">Ödenen</div>
        </div>
        <div className={`${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-3 text-center`}>
          <div className={`text-lg font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueCount}</div>
          <div className="text-xs text-gray-500 mt-1">Geciken</div>
        </div>
      </div>

      {msg && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex justify-between gap-2">
          {msg}<button onClick={() => setMsg('')}>✕</button>
        </div>
      )}

      {/* Hesap formu */}
      {formOpen && (
        <div className="mb-5 p-4 border rounded-xl bg-gray-50">
          <h3 className="font-semibold mb-3">{editId ? 'Hesabı Düzenle' : 'Yeni Fatura Hesabı'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <label className="text-xs text-gray-600">Tür
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
                {TYPES.map(t => <option key={t} value={t}>{BILL_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-600">Hesap adı *
              <input placeholder="ör: Dükkan Elektrik" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-gray-600">Kurum
              <input placeholder="ör: Enerjisa, İSKİ, Türk Telekom" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-gray-600">{isUtility ? 'Abone / Tesisat / Sözleşme No' : 'Hesap / Sözleşme No'}
              <input placeholder="ör: 4577106676, 8145873522 (birden fazla: virgülle)" value={form.subscriberNo} onChange={e => setForm(f => ({ ...f, subscriberNo: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            </label>
            <label className="text-xs text-gray-600">Son ödeme günü (1-31) *
              <input type="number" min={1} max={31} value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-gray-600">Tahmini aylık tutar (₺)
              <input type="number" value={form.estimatedAmount} onChange={e => setForm(f => ({ ...f, estimatedAmount: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            {form.type === 'CREDIT_CARD' && (
              <label className="text-xs text-gray-600">Hesap kesim günü
                <input type="number" min={1} max={31} value={form.statementDay} onChange={e => setForm(f => ({ ...f, statementDay: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </label>
            )}
            <label className="text-xs text-gray-600">Fatura e-postası gönderen (opsiyonel)
              <input placeholder="ör: ckenerji.com.tr" value={form.emailSender} onChange={e => setForm(f => ({ ...f, emailSender: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Abone numarası girilirse sistem Gmail&apos;de bu numarayı içeren fatura e-postalarını bulup o ayın tutarını, fatura numarasını ve son ödeme tarihini otomatik doldurur.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">{editId ? 'Kaydet' : 'Ekle'}</button>
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">İptal</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Yükleniyor…</div>
      ) : (
        <div className="space-y-5">
          {TYPES.map(type => {
            const group = visible.filter(a => a.type === type)
            if (group.length === 0) return null
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[type]}`}>{BILL_TYPE_LABELS[type]}</span>
                  <span className="text-xs text-gray-400">{group.length} hesap</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map(account => {
                    const status = getStatus(account, viewYear, viewMonth)
                    const isPaid = status === 'paid'
                    const p = account.payments.find(x => x.year === viewYear && x.month === viewMonth)
                    const amt = monthAmount(account)
                    return (
                      <div key={account.id} className={`border rounded-xl p-4 ${TYPE_COLORS[account.type] ?? TYPE_COLORS.OTHER}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{account.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {[account.provider, account.subscriberNo ? `No: ${account.subscriberNo}` : null].filter(Boolean).join(' • ') || '—'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {p?.dueDate
                                ? `Son ödeme: ${new Date(p.dueDate).toLocaleDateString('tr-TR')}`
                                : account.type === 'CREDIT_CARD' && account.statementDay
                                  ? `Kesim: ${account.statementDay}. • Son ödeme: ${account.dueDay}.`
                                  : `Her ayın ${account.dueDay}.`}
                            </div>
                          </div>
                          <StatusBadge status={status} />
                        </div>

                        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                          {amt ? (
                            <span className={`font-bold ${amt.estimated ? 'text-gray-500' : 'text-gray-900'}`}>
                              {amt.estimated ? '~' : ''}{fmt(amt.value)} ₺
                            </span>
                          ) : <span className="text-xs text-gray-400">Tutar girilmedi</span>}
                          {amt?.estimated && <span className="text-[10px] text-gray-400">tahmini</span>}
                          {p?.source === 'EMAIL' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">e-postadan</span>}
                          {p?.source === 'SMS' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">SMS&apos;ten</span>}
                          {p?.invoiceNo && <span className="text-[11px] font-mono bg-white/70 px-1.5 py-0.5 rounded border">#{p.invoiceNo}</span>}
                        </div>

                        <div className="flex items-center justify-between mt-3 gap-2">
                          <button
                            onClick={() => togglePay(account.id)}
                            disabled={paying === account.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isPaid ? 'bg-green-600 text-white hover:bg-red-500' : 'bg-white border hover:bg-green-50 text-gray-700'
                            }`}
                          >
                            {paying === account.id ? '…' : isPaid ? '✓ Ödendi — Geri Al' : 'Ödendi İşaretle'}
                          </button>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openBill(account)} className="px-2 py-1 rounded-lg text-xs bg-white border hover:bg-gray-50">Fatura Gir</button>
                            <button onClick={() => openEdit(account)} title="Hesabı düzenle" className="text-gray-400 hover:text-gray-700 p-1"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(account.id)} className="text-gray-300 hover:text-red-400 text-sm px-1">✕</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {visible.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">Henüz fatura hesabı eklenmedi</p>
              <p className="text-sm mt-1">&quot;+ Fatura Hesabı&quot; ile su, elektrik, telefon, internet hesaplarınızı ekleyin</p>
            </div>
          )}
        </div>
      )}

      {/* Aylık fatura giriş modalı */}
      {billEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{billEdit.account.name} — {monthLabel}</h3>
              <button onClick={() => setBillEdit(null)}>✕</button>
            </div>
            <label className="block text-xs text-gray-600">Fatura tutarı (₺)
              <input type="number" value={billEdit.amount} onChange={e => setBillEdit(b => b && ({ ...b, amount: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-semibold" />
            </label>
            <label className="block text-xs text-gray-600">Fatura numarası
              <input value={billEdit.invoiceNo} onChange={e => setBillEdit(b => b && ({ ...b, invoiceNo: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            </label>
            <label className="block text-xs text-gray-600">Son ödeme tarihi
              <input type="date" value={billEdit.dueDate} onChange={e => setBillEdit(b => b && ({ ...b, dueDate: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs text-gray-600">Not
              <input value={billEdit.note} onChange={e => setBillEdit(b => b && ({ ...b, note: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </label>
            <button onClick={saveBill} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-semibold text-sm">Kaydet</button>
          </div>
        </div>
      )}
    </div>
  )
}
