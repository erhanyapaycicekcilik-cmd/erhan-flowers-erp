'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, ChevronDown, ChevronRight, CreditCard, FileText, LayoutDashboard, Package, Plus, Trash2, TrendingDown, TrendingUp, Warehouse, X } from 'lucide-react';
import { BillsPanel } from '@/components/BillsPanel';
import { InstallmentDebtsPanel } from '@/components/InstallmentDebtsPanel';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type StockCard = { id: number; name: string; sku: string | null; stockQuantity: number };
type DebtTransaction = {
  id: number;
  type: 'DEBT_ADDED' | 'PAYMENT_MADE';
  amount: number;
  date: string;
  description: string | null;
  documentNo: string | null;
  quantity: number | null;
  unitPrice: number | null;
  stockCard: { id: number; name: string; sku: string | null } | null;
};
type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  balance: number;
  transactions: DebtTransaction[];
};

type Overview = {
  supplierDebt: number;
  installmentRemaining: number;
  billsUnpaid: number;
  grandTotal: number;
  overdueTotal: number;
  upcoming: Array<{
    kind: 'INSTALLMENT' | 'BILL';
    refId: number;
    title: string;
    party: string | null;
    dueDate: string;
    amount: number | null;
    overdue: boolean;
    detail?: string | null;
  }>;
};

type Tab = 'overview' | 'suppliers' | 'installments' | 'bills';
const TABS: { key: Tab; label: string; icon: typeof Warehouse }[] = [
  { key: 'overview', label: 'Tüm Borçlar', icon: LayoutDashboard },
  { key: 'suppliers', label: 'Tedarikçiler', icon: Warehouse },
  { key: 'installments', label: 'Taksitli Borçlar', icon: CreditCard },
  { key: 'bills', label: 'Faturalar', icon: FileText },
];

const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

export default function BorclarPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);

  // Supplier modal
  const [supplierModal, setSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [supplierSaving, setSupplierSaving] = useState(false);

  // Transaction modal
  const [txModal, setTxModal] = useState<{ open: boolean; supplierId: number | null }>({ open: false, supplierId: null });
  const [txForm, setTxForm] = useState({
    type: 'DEBT_ADDED' as 'DEBT_ADDED' | 'PAYMENT_MADE',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    documentNo: '',
    stockCardId: '',
    quantity: '',
    unitPrice: '',
  });
  const [txSaving, setTxSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [sup, sc] = await Promise.all([
        api<Supplier[]>('/suppliers'),
        api<StockCard[]>('/stock-cards'),
      ]);
      setSuppliers(sup);
      setStockCards(sc);
      loadOverview();
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = () => {
    api<Overview>('/suppliers/overview?days=45').then(setOverview).catch(() => setOverview(null));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'overview') loadOverview(); }, [tab]);

  const totalDebt = suppliers.reduce((s, x) => s + (x.balance > 0 ? x.balance : 0), 0);

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    setSupplierSaving(true);
    try {
      await api('/suppliers', { method: 'POST', json: supplierForm });
      setSupplierModal(false);
      setSupplierForm({ name: '', phone: '', email: '', notes: '' });
      await load();
    } finally { setSupplierSaving(false); }
  };

  const openTx = (supplierId: number) => {
    setTxForm({ type: 'DEBT_ADDED', amount: '', date: new Date().toISOString().slice(0, 10), description: '', documentNo: '', stockCardId: '', quantity: '', unitPrice: '' });
    setTxModal({ open: true, supplierId });
  };

  const saveTx = async () => {
    if (!txForm.amount || !txModal.supplierId) return;
    setTxSaving(true);
    try {
      const payload: Record<string, unknown> = {
        supplierId: txModal.supplierId,
        type: txForm.type,
        amount: Number(txForm.amount),
        date: txForm.date,
        description: txForm.description || undefined,
        documentNo: txForm.documentNo || undefined,
      };
      if (txForm.type === 'DEBT_ADDED' && txForm.stockCardId) {
        payload.stockCardId = Number(txForm.stockCardId);
        if (txForm.quantity) payload.quantity = Number(txForm.quantity);
        if (txForm.unitPrice) payload.unitPrice = Number(txForm.unitPrice);
      }
      await api('/suppliers/transactions', { method: 'POST', json: payload });
      setTxModal({ open: false, supplierId: null });
      await load();
    } finally { setTxSaving(false); }
  };

  const deleteTx = async (txId: number) => {
    if (!confirm('Bu işlemi silmek istiyor musunuz? Stok hareketi de geri alınır.')) return;
    await api(`/suppliers/transactions/${txId}`, { method: 'DELETE' });
    await load();
  };

  const deleteSupplier = async (id: number) => {
    if (!confirm('Bu tedarikçiyi ve tüm borç kayıtlarını silmek istiyor musunuz?')) return;
    await api(`/suppliers/${id}`, { method: 'DELETE' });
    await load();
  };

  const autoCalcAmount = () => {
    const q = parseFloat(txForm.quantity);
    const u = parseFloat(txForm.unitPrice);
    if (!isNaN(q) && !isNaN(u)) setTxForm((f) => ({ ...f, amount: (q * u).toFixed(2) }));
  };

  return (
    <AdminShell title="Borçlar & Faturalar">
      <div className="p-4 space-y-4 max-w-6xl mx-auto">
        {/* Sekmeler */}
        <div className="flex gap-1 overflow-x-auto border-b">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="col-span-2 lg:col-span-1 bg-red-600 text-white rounded-xl p-4">
                <div className="text-xs opacity-80">Toplam Borç</div>
                <div className="text-2xl font-bold">{fmt(overview?.grandTotal ?? 0)} ₺</div>
              </div>
              <button onClick={() => setTab('suppliers')} className="text-left bg-white border rounded-xl p-4 hover:border-blue-300">
                <div className="text-xs text-gray-500">Tedarikçi cari</div>
                <div className="text-lg font-bold text-gray-800">{fmt(overview?.supplierDebt ?? 0)} ₺</div>
              </button>
              <button onClick={() => setTab('installments')} className="text-left bg-white border rounded-xl p-4 hover:border-blue-300">
                <div className="text-xs text-gray-500">Taksitli (kalan)</div>
                <div className="text-lg font-bold text-gray-800">{fmt(overview?.installmentRemaining ?? 0)} ₺</div>
              </button>
              <button onClick={() => setTab('bills')} className="text-left bg-white border rounded-xl p-4 hover:border-blue-300">
                <div className="text-xs text-gray-500">Ödenmemiş faturalar</div>
                <div className="text-lg font-bold text-gray-800">{fmt(overview?.billsUnpaid ?? 0)} ₺</div>
              </button>
              <div className={`rounded-xl p-4 border ${overview && overview.overdueTotal > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                <div className="text-xs text-gray-500">Gecikmiş</div>
                <div className={`text-lg font-bold ${overview && overview.overdueTotal > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(overview?.overdueTotal ?? 0)} ₺</div>
              </div>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b font-semibold flex items-center gap-2"><CalendarClock size={18} /> Ödeme Takvimi — gecikmiş + önümüzdeki 45 gün</div>
              {!overview ? (
                <div className="p-6 text-center text-gray-400 text-sm">Yükleniyor...</div>
              ) : overview.upcoming.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Yaklaşan taksit veya fatura yok.</div>
              ) : (
                <div className="divide-y">
                  {overview.upcoming.map((u) => (
                    <button
                      key={`${u.kind}-${u.refId}-${u.dueDate}`}
                      onClick={() => setTab(u.kind === 'BILL' ? 'bills' : 'installments')}
                      className={`w-full text-left flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 ${u.overdue ? 'bg-red-50' : ''}`}
                    >
                      <span className={`w-24 font-medium ${u.overdue ? 'text-red-600' : 'text-gray-700'}`}>{new Date(u.dueDate).toLocaleDateString('tr-TR')}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${u.kind === 'BILL' ? 'bg-cyan-100 text-cyan-700' : 'bg-purple-100 text-purple-700'}`}>{u.kind === 'BILL' ? 'Fatura' : 'Taksit'}</span>
                      <span className="flex-1 min-w-[160px]">
                        <span className="font-semibold text-gray-800">{u.title}</span>
                        {u.party && <span className="text-gray-500"> • {u.party}</span>}
                        {u.detail && <span className="text-xs text-gray-400"> • {u.detail}</span>}
                      </span>
                      {u.overdue && <span className="text-xs text-red-600 font-semibold">Gecikti</span>}
                      <span className="font-bold w-28 text-right">{u.amount != null ? `${fmt(u.amount)} ₺` : '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {suppliers.some((s) => s.balance > 0) && (
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold flex items-center gap-2"><Warehouse size={18} /> Tedarikçi Bakiyeleri</div>
                <div className="divide-y">
                  {suppliers.filter((s) => s.balance > 0).sort((a, b) => b.balance - a.balance).map((s) => (
                    <button key={s.id} onClick={() => { setTab('suppliers'); setExpanded(s.id); }} className="w-full text-left flex items-center px-4 py-2.5 text-sm hover:bg-gray-50">
                      <span className="flex-1 font-medium">{s.name}</span>
                      <span className="font-bold text-red-600">{fmt(s.balance)} ₺</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'installments' && (
          <InstallmentDebtsPanel suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} onChange={loadOverview} />
        )}

        {tab === 'bills' && <BillsPanel />}

        {tab === 'suppliers' && (<>
        {/* Özet */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="text-red-500 shrink-0" size={28} />
            <div>
              <div className="text-xs text-red-600">Toplam Borç</div>
              <div className="text-xl font-bold text-red-700">{fmt(totalDebt)} ₺</div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <Package className="text-blue-500 shrink-0" size={28} />
            <div>
              <div className="text-xs text-blue-600">Tedarikçi Sayısı</div>
              <div className="text-xl font-bold text-blue-700">{suppliers.length}</div>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setSupplierModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-4 font-semibold"
            >
              <Plus size={18} /> Yeni Tedarikçi Ekle
            </button>
          </div>
        </div>

        {/* Tedarikçi Listesi */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Henüz tedarikçi eklenmedi.</div>
        ) : (
          <div className="space-y-3">
            {suppliers.map((s) => (
              <div key={s.id} className="border rounded-xl overflow-hidden bg-white">
                {/* Header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                >
                  <span className="text-gray-400">{expanded === s.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{s.name}</div>
                    {s.phone && <div className="text-xs text-gray-400">{s.phone}</div>}
                  </div>
                  <div className={`text-right font-bold text-lg ${s.balance > 0 ? 'text-red-600' : s.balance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {s.balance > 0 ? `${fmt(s.balance)} ₺ borç` : s.balance < 0 ? `${fmt(-s.balance)} ₺ alacak` : 'Bakiye sıfır'}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openTx(s.id); }}
                    className="ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1"
                  >
                    <Plus size={14} /> İşlem Ekle
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSupplier(s.id); }}
                    className="ml-1 text-gray-300 hover:text-red-500 p-1.5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Transactions */}
                {expanded === s.id && (
                  <div className="border-t divide-y">
                    {s.transactions.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">Henüz işlem yok</div>
                    ) : (
                      s.transactions.map((tx) => (
                        <div key={tx.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                          <span className={`mt-0.5 shrink-0 ${tx.type === 'DEBT_ADDED' ? 'text-red-500' : 'text-green-500'}`}>
                            {tx.type === 'DEBT_ADDED' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold ${tx.type === 'DEBT_ADDED' ? 'text-red-700' : 'text-green-700'}`}>
                                {tx.type === 'DEBT_ADDED' ? '+ Mal Geldi / Borç' : '− Ödeme Yapıldı'}
                              </span>
                              <span className="text-sm font-bold text-gray-800">{fmt(Number(tx.amount))} ₺</span>
                              <span className="text-xs text-gray-400">{fmtDate(tx.date)}</span>
                              {tx.documentNo && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{tx.documentNo}</span>}
                            </div>
                            {tx.stockCard && (
                              <div className="text-xs text-blue-600 mt-0.5">
                                📦 {tx.stockCard.name} {tx.quantity ? `× ${tx.quantity}` : ''} {tx.stockCard.sku ? `(${tx.stockCard.sku})` : ''}
                              </div>
                            )}
                            {tx.description && <div className="text-xs text-gray-500 mt-0.5">{tx.description}</div>}
                          </div>
                          <button onClick={() => deleteTx(tx.id)} className="shrink-0 text-gray-300 hover:text-red-500 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </>)}
      </div>

      {/* Tedarikçi Modal */}
      {supplierModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Yeni Tedarikçi</h2>
              <button onClick={() => setSupplierModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Tedarikçi Adı *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={supplierForm.name} onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))} placeholder="Örn: Ahmet Çiçekçilik" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Telefon</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={supplierForm.phone} onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))} placeholder="05XX XXX XX XX" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">E-posta</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={supplierForm.email} onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Not</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={supplierForm.notes} onChange={(e) => setSupplierForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <button onClick={saveSupplier} disabled={supplierSaving || !supplierForm.name.trim()} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold text-sm">
              {supplierSaving ? 'Kaydediliyor...' : 'Tedarikçi Ekle'}
            </button>
          </div>
        </div>
      )}

      {/* İşlem Modal */}
      {txModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">İşlem Ekle — {suppliers.find((s) => s.id === txModal.supplierId)?.name}</h2>
              <button onClick={() => setTxModal({ open: false, supplierId: null })}><X size={20} /></button>
            </div>

            {/* Tip */}
            <div className="grid grid-cols-2 gap-2">
              {(['DEBT_ADDED', 'PAYMENT_MADE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxForm((f) => ({ ...f, type: t, stockCardId: '', quantity: '', unitPrice: '' }))}
                  className={`py-3 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 ${txForm.type === t ? (t === 'DEBT_ADDED' ? 'border-red-500 bg-red-50 text-red-700' : 'border-green-500 bg-green-50 text-green-700') : 'border-gray-200 text-gray-500'}`}
                >
                  {t === 'DEBT_ADDED' ? <><TrendingUp size={16} /> Mal Geldi / Borç</> : <><TrendingDown size={16} /> Ödeme Yapıldı</>}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {/* Stok Kartı — sadece mal gelince */}
              {txForm.type === 'DEBT_ADDED' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Stok Kalemi (opsiyonel — seçilirse stok otomatik artar)</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={txForm.stockCardId}
                      onChange={(e) => setTxForm((f) => ({ ...f, stockCardId: e.target.value }))}
                    >
                      <option value="">— Stok kalemi seç —</option>
                      {stockCards.map((sc) => (
                        <option key={sc.id} value={sc.id}>{sc.name}{sc.sku ? ` (${sc.sku})` : ''} — stok: {sc.stockQuantity}</option>
                      ))}
                    </select>
                  </div>
                  {txForm.stockCardId && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Gelen Miktar</label>
                        <input
                          type="number" min="0" className="w-full border rounded-lg px-3 py-2 text-sm"
                          value={txForm.quantity}
                          onChange={(e) => setTxForm((f) => ({ ...f, quantity: e.target.value }))}
                          onBlur={autoCalcAmount}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Birim Fiyat (₺)</label>
                        <input
                          type="number" min="0" className="w-full border rounded-lg px-3 py-2 text-sm"
                          value={txForm.unitPrice}
                          onChange={(e) => setTxForm((f) => ({ ...f, unitPrice: e.target.value }))}
                          onBlur={autoCalcAmount}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Toplam Tutar (₺) *</label>
                <input type="number" min="0" className="w-full border rounded-lg px-3 py-2 text-sm font-semibold" value={txForm.amount} onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Tarih *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={txForm.date} onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Belge / Fatura No</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={txForm.documentNo} onChange={(e) => setTxForm((f) => ({ ...f, documentNo: e.target.value }))} placeholder="Opsiyonel" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Açıklama</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={txForm.description} onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))} placeholder="Opsiyonel" />
              </div>
            </div>

            <button onClick={saveTx} disabled={txSaving || !txForm.amount || !txForm.date} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold text-sm">
              {txSaving ? 'Kaydediliyor...' : txForm.type === 'DEBT_ADDED' ? '+ Borç Ekle' : '− Ödeme Kaydet'}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
