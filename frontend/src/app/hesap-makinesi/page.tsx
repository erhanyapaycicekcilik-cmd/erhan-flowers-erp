'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';
import { Box, Calculator, Plus, Ruler, Trash2 } from 'lucide-react';

type BambuPriceRow = { id: number; sizeCm: number; pricePerStem: string; isManual: boolean };

export default function CalculatorPage() {
  const [tab, setTab] = useState<'bambu' | 'dikey-bahce' | 'mdf-saksi'>('bambu');

  return (
    <AdminShell title="Hesap Makinesi">
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'bambu' ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-line'}`}
          onClick={() => setTab('bambu')}
        >
          Tekli Bambu
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'dikey-bahce' ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-line'}`}
          onClick={() => setTab('dikey-bahce')}
        >
          Dikey Bahçe (m²)
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'mdf-saksi' ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-line'}`}
          onClick={() => setTab('mdf-saksi')}
        >
          MDF Saksı
        </button>
      </div>
      {tab === 'bambu' ? <BambuCalculator /> : tab === 'dikey-bahce' ? <DikeyBahceCalculator /> : <MdfSaksiCalculator />}
    </AdminShell>
  );
}

function BambuCalculator() {
  const [sizeCm, setSizeCm] = useState(150);
  const [quantity, setQuantity] = useState(5);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<{ unitPrice: number; totalPrice: number; interpolated: boolean } | null>(null);
  const [message, setMessage] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const [rows, setRows] = useState<BambuPriceRow[]>([]);
  const [newSize, setNewSize] = useState('');
  const [newPrice, setNewPrice] = useState('');

  async function calculate() {
    if (!sizeCm || !quantity) {
      setMessage('Boy ve adet girilmeli.');
      return;
    }
    setCalculating(true);
    setMessage('');
    try {
      const data = await api<{ unitPrice: number; totalPrice: number; interpolated: boolean }>(
        `/production-costs/bambu/stem-prices/calculate?sizeCm=${sizeCm}&quantity=${quantity}`,
      );
      setResult(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Hesaplanamadı.');
    } finally {
      setCalculating(false);
    }
  }

  async function loadTable() {
    try {
      const data = await api<BambuPriceRow[]>('/production-costs/bambu/stem-prices');
      setRows(data);
      setTableOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fiyat tablosu açılamadı.');
    }
  }

  async function saveRow(rowSizeCm: number, pricePerStem: string) {
    try {
      await api('/production-costs/bambu/stem-prices', { method: 'POST', json: { sizeCm: rowSizeCm, pricePerStem: Number(pricePerStem) } });
      await loadTable();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Satır kaydedilemedi.');
    }
  }

  async function deleteRow(id: number) {
    try {
      await api(`/production-costs/bambu/stem-prices/${id}/delete`, { method: 'POST' });
      await loadTable();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Satır silinemedi.');
    }
  }

  async function addNewRow() {
    if (!newSize || !newPrice) return;
    await saveRow(Number(newSize), newPrice);
    setNewSize('');
    setNewPrice('');
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold"><Calculator size={20} className="text-brand" />Tekli Bambu Fiyat Hesaplama</div>
          <button type="button" className="text-sm font-semibold text-brand underline" onClick={loadTable}>Fiyat Tablosunu Yönet</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Boy (cm)">
            <input className="field" type="number" min="0" value={sizeCm || ''} onChange={(event) => setSizeCm(Number(event.target.value) || 0)} />
          </Field>
          <Field label="Adet">
            <input className="field" type="number" min="0" value={quantity || ''} onChange={(event) => setQuantity(Number(event.target.value) || 0)} />
          </Field>
          <div className="flex items-end">
            <button type="button" className="btn btn-primary w-full justify-center" onClick={calculate} disabled={calculating}>
              {calculating ? 'Hesaplanıyor...' : 'Hesapla'}
            </button>
          </div>
        </div>
        {message && <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{message}</div>}
        {result && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Summary label="Birim Fiyat" value={money(result.unitPrice)} />
              <Summary label="Adet" value={String(quantity)} />
              <Summary label="Toplam" value={money(result.totalPrice)} strong />
            </div>
            {result.interpolated && <p className="mt-2 text-xs text-amber-700">Bu boy için tabloda tam kayıt yok, en yakın iki boy arasında ara değer hesaplandı.</p>}
          </div>
        )}
      </div>

      {tableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Tekli Bambu Fiyat Tablosu</h2>
                <p className="mt-1 text-sm text-slate-500">Standart boylar otomatik hesaplanır; her satırı elle düzenleyip kaydedebilir, yeni özel boy ekleyebilirsin.</p>
              </div>
              <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold" onClick={() => setTableOpen(false)}>Kapat</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-line bg-slate-50 p-3">
              <Field label="Yeni boy (cm)"><input className="field" value={newSize} onChange={(event) => setNewSize(event.target.value)} /></Field>
              <Field label="Fiyat (TL)"><input className="field" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} /></Field>
              <div className="flex items-end"><button type="button" className="btn btn-primary w-full justify-center" onClick={addNewRow}><Plus size={16} />Ekle</button></div>
            </div>
            <div className="mt-4 max-h-96 overflow-auto rounded-md border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr><th className="px-3 py-2">Boy (cm)</th><th className="px-3 py-2">Fiyat (TL)</th><th className="px-3 py-2">Kaynak</th><th className="px-3 py-2"></th></tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <BambuPriceRowView key={row.id} row={row} onSave={(price) => saveRow(row.sizeCm, price)} onDelete={() => deleteRow(row.id)} />
                  ))}
                  {!rows.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">Kayıt yok.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BambuPriceRowView({ row, onSave, onDelete }: { row: BambuPriceRow; onSave: (price: string) => void; onDelete: () => void }) {
  const [price, setPrice] = useState(String(row.pricePerStem));
  return (
    <tr className="border-t border-line">
      <td className="px-3 py-2 font-semibold">{row.sizeCm}</td>
      <td className="px-3 py-2">
        <input className="w-24 rounded-md border border-line px-2 py-1" value={price} onChange={(event) => setPrice(event.target.value)} onBlur={() => price !== String(row.pricePerStem) && onSave(price)} />
      </td>
      <td className="px-3 py-2 text-xs text-slate-500">{row.isManual ? 'Elle' : 'Otomatik'}</td>
      <td className="px-3 py-2"><button type="button" className="text-red-600" onClick={onDelete}><Trash2 size={14} /></button></td>
    </tr>
  );
}

function DikeyBahceCalculator() {
  const [widthCm, setWidthCm] = useState(0);
  const [heightCm, setHeightCm] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);

  const areaM2 = Math.round(((widthCm / 100) * (heightCm / 100)) * 100) / 100;
  const total = areaM2 * unitPrice;

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center gap-2 text-lg font-bold"><Ruler size={20} className="text-brand" />Dikey Bahçe m² Hesaplama</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Genişlik (cm)">
          <input className="field" type="number" min="0" value={widthCm || ''} onChange={(event) => setWidthCm(Number(event.target.value) || 0)} />
        </Field>
        <Field label="Yükseklik (cm)">
          <input className="field" type="number" min="0" value={heightCm || ''} onChange={(event) => setHeightCm(Number(event.target.value) || 0)} />
        </Field>
        <Field label="m² Birim Fiyatı (TL)">
          <input className="field" type="number" min="0" value={unitPrice || ''} onChange={(event) => setUnitPrice(Number(event.target.value) || 0)} />
        </Field>
      </div>
      {widthCm > 0 && heightCm > 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="Alan" value={`${areaM2.toLocaleString('tr-TR')} m²`} />
            <Summary label="m² Birim Fiyat" value={money(unitPrice)} />
            <Summary label="Toplam" value={money(total)} strong />
          </div>
        </div>
      )}
    </div>
  );
}

function MdfSaksiCalculator() {
  const [sizeCm, setSizeCm] = useState(0);
  const [pricePerCm, setPricePerCm] = useState(0);
  const [vatPercent, setVatPercent] = useState(20);
  const [profitPercent, setProfitPercent] = useState(45);

  const cost = sizeCm * pricePerCm;
  const vatAmount = cost * (vatPercent / 100);
  const vatIncludedCost = cost + vatAmount;
  const profitAmount = vatIncludedCost * (profitPercent / 100);
  const salePrice = vatIncludedCost + profitAmount;

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center gap-2 text-lg font-bold"><Box size={20} className="text-brand" />MDF Saksı Maliyet ve Satış Fiyatı</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Saksı Boyu (cm)">
          <input className="field" type="number" min="0" value={sizeCm || ''} onChange={(event) => setSizeCm(Number(event.target.value) || 0)} />
        </Field>
        <Field label="cm Başına Fiyat (TL)">
          <input className="field" type="number" min="0" value={pricePerCm || ''} onChange={(event) => setPricePerCm(Number(event.target.value) || 0)} />
        </Field>
        <Field label="KDV Oranı (%)">
          <input className="field" type="number" min="0" value={vatPercent || ''} onChange={(event) => setVatPercent(Number(event.target.value) || 0)} />
        </Field>
        <Field label="Kâr Oranı (%)">
          <input className="field" type="number" min="0" value={profitPercent || ''} onChange={(event) => setProfitPercent(Number(event.target.value) || 0)} />
        </Field>
      </div>
      {sizeCm > 0 && pricePerCm > 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Maliyet" value={money(cost)} />
            <Summary label="KDV Dahil Maliyet" value={money(vatIncludedCost)} />
            <Summary label="Kâr Tutarı" value={money(profitAmount)} />
            <Summary label="Satış Fiyatı" value={money(salePrice)} strong />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className={strong ? 'text-2xl font-bold text-emerald-900' : 'text-lg font-semibold text-slate-800'}>{value}</div>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
}
