'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Brain, Plus, RefreshCw, Save, Search } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api } from '@/lib/api';

type PlantType = {
  id: number;
  name: string;
  normalizedName: string;
  description: string | null;
  isActive: boolean;
  productFamily?: { id: number; familyName: string } | null;
  defaultLeafStockCard?: { id: number; name: string; sku: string | null } | null;
  defaultTrunkStockCard?: { id: number; name: string; sku: string | null } | null;
};

type Alias = {
  id: number;
  alias: string;
  normalizedAlias: string;
  entityType: 'PLANT_TYPE' | 'POT_PROFILE' | 'MATERIAL_RULE';
  priority: number;
  isActive: boolean;
  plantType?: { id: number; name: string } | null;
  potProfile?: { id: number; name: string } | null;
};

type PotProfile = {
  id: number;
  name: string;
  normalizedName: string;
  materialType: string | null;
  color: string | null;
  width: string | null;
  depth: string | null;
  height: string | null;
  diameter: string | null;
  priority: number;
  isActive: boolean;
  stockCard?: { id: number; name: string; sku: string | null } | null;
};

type RecipeProfile = {
  id: number;
  name: string;
  minHeightCm: number | null;
  maxHeightCm: number | null;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
  plantType?: { id: number; name: string } | null;
  productFamily?: { id: number; familyName: string } | null;
  items: Array<{ id: number; componentType: string; quantity: string; unit: string; stockCard?: { id: number; name: string; sku: string | null } | null }>;
};

type AnalysisResult = {
  originalText: string;
  normalizedText: string;
  heightCm: number | null;
  plantType: { id: number; name: string; confidence: number } | null;
  productFamily: { id: number; name: string; confidence: number } | null;
  potProfile: { id: number; name: string; stockCardId: number | null; confidence: number } | null;
  defaultLeafStockCard: { name?: string; sku?: string | null } | null;
  defaultTrunkStockCard: { name?: string; sku?: string | null } | null;
  recipeProfile: { id: number; name: string; items: unknown[] } | null;
  warnings: string[];
  ambiguities: unknown[];
  overallConfidence: number;
};

const tabs = ['Bitki Türleri', 'Eş Anlamlılar', 'Saksı Profilleri', 'Reçete Profilleri', 'Analiz Testi'] as const;
type Tab = (typeof tabs)[number];

export default function ProductKnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Bitki Türleri');
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [potProfiles, setPotProfiles] = useState<PotProfile[]>([]);
  const [recipeProfiles, setRecipeProfiles] = useState<RecipeProfile[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const enabled = process.env.NEXT_PUBLIC_ENABLE_KNOWLEDGE_BASE === 'true';

  async function load() {
    setLoading(true);
    try {
      const [plants, aliasList, pots, recipes] = await Promise.all([
        api<PlantType[]>('/knowledge-base/plant-types'),
        api<Alias[]>('/knowledge-base/aliases'),
        api<PotProfile[]>('/knowledge-base/pot-profiles'),
        api<RecipeProfile[]>('/knowledge-base/recipe-profiles'),
      ]);
      setPlantTypes(plants);
      setAliases(aliasList);
      setPotProfiles(pots);
      setRecipeProfiles(recipes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ürün Bilgi Motoru yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (enabled) load();
  }, [enabled]);

  if (!enabled) {
    return (
      <AdminShell title="Ürün Bilgi Motoru">
        <section className="panel p-5">
          <h2 className="font-bold">Bu ekran development ortamında aktiftir.</h2>
          <p className="mt-2 text-sm text-slate-500">Canlı sistemde Knowledge Base migration uygulanmadığı için bu modül kapalı tutulur.</p>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Ürün Bilgi Motoru">
      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain size={20} />
            <div>
              <h2 className="font-bold">Merkezi ürün bilgisi</h2>
              <p className="text-sm text-slate-500">Bu ekran sadece test ve yönetim içindir; ürün veya maliyet kaydı oluşturmaz.</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} />
            Yenile
          </button>
        </div>

        {message && <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{message}</div>}

        <div className="mt-5 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab} className={`rounded-md px-3 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'Bitki Türleri' && <PlantTypesTab plantTypes={plantTypes} onSaved={load} />}
      {activeTab === 'Eş Anlamlılar' && <AliasesTab aliases={aliases} plantTypes={plantTypes} potProfiles={potProfiles} onSaved={load} />}
      {activeTab === 'Saksı Profilleri' && <PotProfilesTab potProfiles={potProfiles} onSaved={load} />}
      {activeTab === 'Reçete Profilleri' && <RecipeProfilesTab recipeProfiles={recipeProfiles} plantTypes={plantTypes} onSaved={load} />}
      {activeTab === 'Analiz Testi' && <AnalysisTab />}
    </AdminShell>
  );
}

function PlantTypesTab({ plantTypes, onSaved }: { plantTypes: PlantType[]; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', description: '', isActive: true });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/knowledge-base/plant-types', { method: 'POST', json: form });
      setForm({ name: '', description: '', isActive: true });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Bitki Türleri" count={plantTypes.length}>
      <form className="grid gap-3 md:grid-cols-[1fr_1.5fr_120px]" onSubmit={submit}>
        <TextField label="Bitki adı" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <TextField label="Açıklama" value={form.description} onChange={(description) => setForm({ ...form, description })} />
        <button className="btn btn-primary justify-center self-end" disabled={saving}>
          <Plus size={16} />
          Ekle
        </button>
      </form>
      <SimpleTable
        headers={['Ad', 'Arama adı', 'Aile', 'Yaprak', 'Gövde', 'Durum']}
        rows={plantTypes.map((item) => [
          item.name,
          item.normalizedName,
          item.productFamily?.familyName ?? '-',
          item.defaultLeafStockCard?.name ?? '-',
          item.defaultTrunkStockCard?.name ?? '-',
          item.isActive ? 'Aktif' : 'Pasif',
        ])}
      />
    </Section>
  );
}

function AliasesTab({ aliases, plantTypes, potProfiles, onSaved }: { aliases: Alias[]; plantTypes: PlantType[]; potProfiles: PotProfile[]; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ alias: '', entityType: 'PLANT_TYPE', plantTypeId: '', potProfileId: '', priority: 100, isActive: true });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/knowledge-base/aliases', {
        method: 'POST',
        json: {
          alias: form.alias,
          entityType: form.entityType,
          plantTypeId: form.entityType === 'PLANT_TYPE' ? Number(form.plantTypeId) : null,
          potProfileId: form.entityType === 'POT_PROFILE' ? Number(form.potProfileId) : null,
          priority: form.priority,
          isActive: form.isActive,
        },
      });
      setForm({ alias: '', entityType: 'PLANT_TYPE', plantTypeId: '', potProfileId: '', priority: 100, isActive: true });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Eş Anlamlılar" count={aliases.length}>
      <form className="grid gap-3 md:grid-cols-5" onSubmit={submit}>
        <TextField label="Eş anlamlı ad" value={form.alias} onChange={(alias) => setForm({ ...form, alias })} required />
        <SelectField label="Hedef tipi" value={form.entityType} onChange={(entityType) => setForm({ ...form, entityType, plantTypeId: '', potProfileId: '' })}>
          <option value="PLANT_TYPE">Bitki türü</option>
          <option value="POT_PROFILE">Saksı profili</option>
        </SelectField>
        {form.entityType === 'PLANT_TYPE' ? (
          <SelectField label="Bitki" value={form.plantTypeId} onChange={(plantTypeId) => setForm({ ...form, plantTypeId })}>
            <option value="">Seç</option>
            {plantTypes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </SelectField>
        ) : (
          <SelectField label="Saksı" value={form.potProfileId} onChange={(potProfileId) => setForm({ ...form, potProfileId })}>
            <option value="">Seç</option>
            {potProfiles.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </SelectField>
        )}
        <NumberField label="Öncelik" value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
        <button className="btn btn-primary justify-center self-end" disabled={saving}>
          <Plus size={16} />
          Ekle
        </button>
      </form>
      <SimpleTable
        headers={['Ad', 'Arama adı', 'Hedef', 'Öncelik', 'Durum']}
        rows={aliases.map((item) => [
          item.alias,
          item.normalizedAlias,
          item.plantType?.name ?? item.potProfile?.name ?? '-',
          item.priority,
          item.isActive ? 'Aktif' : 'Pasif',
        ])}
      />
    </Section>
  );
}

function PotProfilesTab({ potProfiles, onSaved }: { potProfiles: PotProfile[]; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', materialType: '', color: '', width: '', depth: '', height: '', diameter: '', priority: 100 });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/knowledge-base/pot-profiles', { method: 'POST', json: form });
      setForm({ name: '', materialType: '', color: '', width: '', depth: '', height: '', diameter: '', priority: 100 });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Saksı Profilleri" count={potProfiles.length}>
      <form className="grid gap-3 md:grid-cols-4 xl:grid-cols-8" onSubmit={submit}>
        <TextField label="Saksı adı" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <TextField label="Malzeme" value={form.materialType} onChange={(materialType) => setForm({ ...form, materialType })} />
        <TextField label="Renk" value={form.color} onChange={(color) => setForm({ ...form, color })} />
        <TextField label="En" value={form.width} onChange={(width) => setForm({ ...form, width })} />
        <TextField label="Derinlik" value={form.depth} onChange={(depth) => setForm({ ...form, depth })} />
        <TextField label="Yükseklik" value={form.height} onChange={(height) => setForm({ ...form, height })} />
        <TextField label="Çap" value={form.diameter} onChange={(diameter) => setForm({ ...form, diameter })} />
        <button className="btn btn-primary justify-center self-end" disabled={saving}>
          <Plus size={16} />
          Ekle
        </button>
      </form>
      <SimpleTable
        headers={['Ad', 'Malzeme', 'Renk', 'Ölçü', 'Stok kartı', 'Durum']}
        rows={potProfiles.map((item) => [
          item.name,
          item.materialType ?? '-',
          item.color ?? '-',
          [item.width, item.depth, item.height, item.diameter ? `Çap ${item.diameter}` : null].filter(Boolean).join(' x ') || '-',
          item.stockCard?.name ?? '-',
          item.isActive ? 'Aktif' : 'Pasif',
        ])}
      />
    </Section>
  );
}

function RecipeProfilesTab({ recipeProfiles, plantTypes, onSaved }: { recipeProfiles: RecipeProfile[]; plantTypes: PlantType[]; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', plantTypeId: '', minHeightCm: '', maxHeightCm: '', isDefault: true });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/knowledge-base/recipe-profiles', {
        method: 'POST',
        json: {
          name: form.name,
          plantTypeId: form.plantTypeId ? Number(form.plantTypeId) : null,
          minHeightCm: form.minHeightCm ? Number(form.minHeightCm) : null,
          maxHeightCm: form.maxHeightCm ? Number(form.maxHeightCm) : null,
          isDefault: form.isDefault,
          items: [],
        },
      });
      setForm({ name: '', plantTypeId: '', minHeightCm: '', maxHeightCm: '', isDefault: true });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Reçete Profilleri" count={recipeProfiles.length}>
      <form className="grid gap-3 md:grid-cols-5" onSubmit={submit}>
        <TextField label="Reçete adı" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <SelectField label="Bitki türü" value={form.plantTypeId} onChange={(plantTypeId) => setForm({ ...form, plantTypeId })}>
          <option value="">Seç</option>
          {plantTypes.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </SelectField>
        <TextField label="Min cm" value={form.minHeightCm} onChange={(minHeightCm) => setForm({ ...form, minHeightCm })} />
        <TextField label="Max cm" value={form.maxHeightCm} onChange={(maxHeightCm) => setForm({ ...form, maxHeightCm })} />
        <button className="btn btn-primary justify-center self-end" disabled={saving}>
          <Save size={16} />
          Kaydet
        </button>
      </form>
      <SimpleTable
        headers={['Ad', 'Bitki', 'Boy aralığı', 'Kalem', 'Durum']}
        rows={recipeProfiles.map((item) => [
          item.name,
          item.plantType?.name ?? item.productFamily?.familyName ?? '-',
          `${item.minHeightCm ?? '-'} / ${item.maxHeightCm ?? '-'}`,
          item.items.length,
          item.isActive ? 'Aktif' : 'Pasif',
        ])}
      />
    </Section>
  );
}

function AnalysisTab() {
  const [text, setText] = useState('MDF 100 CM Saksıda Bambu');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      setResult(await api<AnalysisResult>('/knowledge-base/analyze-product-name', { method: 'POST', json: { text } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Analiz yapılamadı.');
    } finally {
      setLoading(false);
    }
  }

  const confidencePercent = useMemo(() => (result ? Math.round(result.overallConfidence * 100) : 0), [result]);

  return (
    <Section title="Analiz Testi">
      <form className="grid gap-3 md:grid-cols-[1fr_150px]" onSubmit={analyze}>
        <TextField label="Ürün adı" value={text} onChange={setText} required />
        <button className="btn btn-primary justify-center self-end" disabled={loading}>
          <Search size={16} />
          Analiz Et
        </button>
      </form>
      {message && <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</div>}
      {result && (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <ResultCard label="Algılanan bitki" value={result.plantType?.name ?? '-'} detail={result.plantType ? `%${Math.round(result.plantType.confidence * 100)} güven` : undefined} />
          <ResultCard label="Algılanan boy" value={result.heightCm ? `${result.heightCm} cm` : '-'} />
          <ResultCard label="Algılanan saksı" value={result.potProfile?.name ?? '-'} detail={result.potProfile ? `%${Math.round(result.potProfile.confidence * 100)} güven` : undefined} />
          <ResultCard label="Önerilen yaprak" value={result.defaultLeafStockCard?.name ?? '-'} />
          <ResultCard label="Önerilen gövde" value={result.defaultTrunkStockCard?.name ?? '-'} />
          <ResultCard label="Önerilen reçete" value={result.recipeProfile?.name ?? '-'} />
          <ResultCard label="Genel güven" value={`%${confidencePercent}`} detail={result.normalizedText} />
          <ResultCard label="Uyarılar" value={result.warnings.length ? result.warnings.join(', ') : 'Yok'} />
          <ResultCard label="Belirsiz sonuçlar" value={result.ambiguities.length ? `${result.ambiguities.length} belirsizlik` : 'Yok'} />
        </div>
      )}
    </Section>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="panel mt-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {typeof count === 'number' && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{count} kayıt</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-slate-600">
      {label}
      <input className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-semibold text-slate-600">
      {label}
      <input className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-600">
      {label}
      <select className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none focus:border-brand" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-3">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-5 text-center text-slate-500" colSpan={headers.length}>Kayıt yok.</td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-3 align-top">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ResultCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-base font-bold text-ink">{value}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  );
}
