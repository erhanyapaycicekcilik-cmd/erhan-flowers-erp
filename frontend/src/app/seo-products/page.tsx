'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { CheckSquare, Download, ExternalLink, Eye, ImageIcon, RefreshCw, Save, Sparkles, Upload, X } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { api, apiFileUrl } from '@/lib/api';

type ImageEntry = {
  url: string;
  fileName: string;
  status: string;
  isMain: boolean;
  width?: number | null;
  height?: number | null;
};

type ProductProperties = {
  familyName: string | null;
  plantType: string | null;
  heightCm: string | null;
  trunkType: string | null;
  trunkCount: string | null;
  leafCount: string | null;
  potShape: string | null;
  potType: string | null;
  potColor: string | null;
  potWidthCm: string | null;
  potLengthCm: string | null;
  potHeightCm: string | null;
  potDiameterCm: string | null;
  productColor: string | null;
  usageArea: string | null;
  extraFeatures: string | null;
  pendingMainImageUrl?: string | null;
};

type SeoProduct = {
  id: number;
  barcode: string;
  currentModelCode: string | null;
  proposedModelCode: string | null;
  supplierStockCode?: string | null;
  oldProductName: string;
  seoProductName: string | null;
  manualProductName: string | null;
  marketTitle: string | null;
  webTitle: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  imageAltText: string | null;
  mainCategory: string | null;
  familyId: number | null;
  familyName: string | null;
  size: string | null;
  pot: string | null;
  color: string | null;
  distinctiveFeature: string | null;
  approvalStatus: 'Hazır Onay' | 'Eksik Bilgi' | 'İnceleme Gerekli';
  trendyolProductUrl: string | null;
  salePrice: number;
  stockQuantity: number;
  images: ImageEntry[];
  properties: ProductProperties;
  modelGroup: string;
};

type Family = {
  id: number;
  familyName: string;
};

const emptyProperties: ProductProperties = {
  familyName: '',
  plantType: '',
  heightCm: '',
  trunkType: '',
  trunkCount: '',
  leafCount: '',
  potShape: 'Kare',
  potType: '',
  potColor: '',
  potWidthCm: '',
  potLengthCm: '',
  potHeightCm: '',
  potDiameterCm: '',
  productColor: '',
  usageArea: 'Ev, ofis, mağaza, otel ve iç mekan dekorasyonu',
  extraFeatures: '',
  pendingMainImageUrl: '',
};

const potOptions = [
  'Beyaz Plastik Saksı',
  'Siyah Plastik Saksı',
  'Beyaz Vega',
  'Siyah Vega',
  'Beyaz Lilyum',
  'Siyah Lilyum',
  'Beyaz Küre',
  'Siyah Küre',
  'Siyah Gold 30x30',
  'Siyah Gold 25x25',
  'Siyah Gümüş 30x30',
  'Siyah Gümüş 25x25',
  'Beyaz Gold 30x30',
  'Beyaz Gold 25x25',
  'Beyaz Gümüş 30x30',
  'Beyaz Gümüş 25x25',
  'Siyah Lilyum 31x58',
  'Beyaz Lilyum 31x58',
  'Metal Saksı 30x30',
  'Metal Saksı 25x25',
  'Metal Saksı',
  'Nergiz',
  'Luna',
  'Diğer',
];

const tabs = ['Ürün Bilgileri', 'Ürün Adı ve SEO', 'Açıklamalar', 'Görseller', 'Ön İzleme ve Onay'] as const;
type TabName = typeof tabs[number];

export default function SeoProductsPage() {
  const [items, setItems] = useState<SeoProduct[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [familyId, setFamilyId] = useState('');
  const [potName, setPotName] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<SeoProduct | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('Ürün Bilgileri');
  const [previewImage, setPreviewImage] = useState<ImageEntry | null>(null);

  async function load() {
    const [productData, familyData] = await Promise.all([
      api<SeoProduct[]>('/seo-products'),
      api<Family[]>('/production-costs/families'),
    ]);
    setItems(productData);
    setFamilies(familyData);
    setEditing((current) => current ? productData.find((item) => item.id === current.id) ?? current : null);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const visibleItems = useMemo(() => {
    const needle = normalize(search);
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'Tümü' || item.approvalStatus === statusFilter;
      const text = normalize(`${item.barcode} ${item.oldProductName} ${item.seoProductName ?? ''} ${item.familyName ?? ''} ${item.pot ?? ''}`);
      return matchesStatus && (!needle || text.includes(needle));
    });
  }, [items, search, statusFilter]);

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function selectVisible() {
    setSelected(visibleItems.map((item) => item.id));
  }

  async function postAction(path: string, body: Record<string, unknown>, success: string) {
    await api(`/seo-products/${path}`, { method: 'POST', json: body });
    setMessage(success);
    await load();
  }

  async function assignFamily() {
    if (!familyId) return setMessage('Aile seçilmelidir.');
    await postAction('assign-family', { variantIds: selected, familyId: Number(familyId) }, 'Seçilen ürünlere aile atandı.');
  }

  async function assignPot() {
    if (!potName) return setMessage('Saksı seçilmelidir.');
    await postAction('assign-pot', { variantIds: selected, potName }, 'Seçilen ürünlere saksı atandı.');
  }

  async function rebuildNames() {
    await postAction('rebuild-names', { variantIds: selected }, 'Seçilen ürün adları yeniden oluşturuldu.');
  }

  async function approveBulk() {
    await postAction('approve', { variantIds: selected }, 'Seçilen ürün adları onaylandı.');
  }

  async function openEditor(item: SeoProduct, tab: TabName = 'Ürün Bilgileri') {
    const detail = await api<SeoProduct>(`/seo-products/${item.id}`);
    setEditing(detail);
    setActiveTab(tab);
  }

  function updateEditing(patch: Partial<SeoProduct>) {
    setEditing((current) => current ? { ...current, ...patch } : current);
  }

  function updateProperties(patch: Partial<ProductProperties>) {
    setEditing((current) => current ? { ...current, properties: { ...emptyProperties, ...current.properties, ...patch } } : current);
  }

  async function generateContent() {
    if (!editing) return;
    const generated = await api<any>(`/seo-products/${editing.id}/generate`, {
      method: 'POST',
      json: { properties: editing.properties },
    });
    updateEditing({
      properties: generated.properties,
      seoProductName: generated.seoProductName,
      manualProductName: generated.manualProductName,
      marketTitle: generated.marketTitle,
      webTitle: generated.webTitle,
      shortDescription: generated.shortDescription,
      longDescription: generated.longDescription,
      metaTitle: generated.metaTitle,
      metaDescription: generated.metaDescription,
      keywords: generated.keywords,
      imageAltText: generated.imageAltText,
    });
    setMessage(generated.warnings?.[0] ?? 'SEO içeriği oluşturuldu.');
  }

  async function generateName() {
    if (!editing) return;
    const generated = await api<any>(`/seo-products/${editing.id}/generate`, {
      method: 'POST',
      json: { properties: editing.properties },
    });
    updateEditing({
      properties: generated.properties,
      seoProductName: generated.seoProductName,
      manualProductName: generated.manualProductName,
    });
    setMessage('Ürün adı oluşturuldu. Onaylamadan eski ürün adı değişmez.');
  }

  async function saveDraft() {
    if (!editing) return;
    const saved = await api<SeoProduct>(`/seo-products/${editing.id}/draft`, {
      method: 'POST',
      json: editorPayload(editing),
    });
    setEditing(saved);
    setMessage('Taslak kaydedildi.');
    await load();
  }

  async function approveOne() {
    if (!editing) return;
    const saved = await api<SeoProduct>(`/seo-products/${editing.id}/approve`, {
      method: 'POST',
      json: editorPayload(editing),
    });
    setEditing(saved);
    setMessage('Ürün dönüşümü onaylandı. Barkod ve Trendyol bağlantısı korundu.');
    await load();
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    if (!editing || !event.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', event.target.files[0]);
    const saved = await api<SeoProduct>(`/seo-products/${editing.id}/image`, { method: 'POST', body: formData });
    setEditing(saved);
    setMessage('Yeni görsel sürümü yüklendi. Ana görsel değişimi onay bekliyor.');
    await load();
    event.target.value = '';
  }

  async function imageAction(index: number, path: string, success: string, body: Record<string, unknown> = {}) {
    if (!editing) return;
    try {
      const saved = await api<SeoProduct>(`/seo-products/${editing.id}/images/${index}/${path}`, { method: 'POST', json: body });
      setEditing(saved);
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'İşlem tamamlanamadı.');
    }
  }

  function exportExcel() {
    const rows = [
      ['Barkod', 'Model Kodu', 'Eski Ürün Adı', 'Yeni SEO Ürün Adı', 'Ana Kategori', 'Ürün Ailesi', 'Boy', 'Saksı', 'Renk', 'Özellik', 'Onay Durumu', 'Trendyol Linki'],
      ...visibleItems.map((item) => [
        item.barcode,
        item.currentModelCode ?? '',
        item.oldProductName,
        item.seoProductName ?? '',
        item.mainCategory ?? '',
        item.familyName ?? '',
        item.size ?? '',
        item.pot ?? '',
        item.color ?? '',
        item.distinctiveFeature ?? '',
        item.approvalStatus,
        item.trendyolProductUrl ?? '',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seo-urun-adi-donusum.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell title="SEO ve Ürün Adı Dönüşüm Merkezi">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">SEO ve Ürün Adı Dönüşüm Merkezi</h2>
          <p className="text-sm text-slate-500">Barkod sabit kalır; ürün adı, açıklama, SEO ve görsel dönüşümü tek panelden hazırlanır.</p>
        </div>
        <button className="btn btn-secondary" onClick={exportExcel}>
          <Download size={17} />
          Excel Dışa Aktar
        </button>
      </div>

      {message && <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

      <section className="panel mb-4 p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_auto]">
          <input className="field" placeholder="Barkod, ürün adı, aile veya saksı ara" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>Tümü</option>
            <option>Hazır Onay</option>
            <option>Eksik Bilgi</option>
            <option>İnceleme Gerekli</option>
          </select>
          <button className="btn btn-secondary" onClick={selectVisible}>
            <CheckSquare size={17} />
            Görünenleri Seç
          </button>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[220px_auto_220px_auto_auto_auto]">
          <select className="field" value={familyId} onChange={(event) => setFamilyId(event.target.value)}>
            <option value="">Aile seç</option>
            {families.map((family) => <option key={family.id} value={family.id}>{family.familyName}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={assignFamily} disabled={selected.length === 0}>Seçilenlere Aile Ata</button>
          <select className="field" value={potName} onChange={(event) => setPotName(event.target.value)}>
            <option value="">Saksı seç</option>
            {potOptions.map((pot) => <option key={pot} value={pot}>{pot}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={assignPot} disabled={selected.length === 0}>Seçilenlere Saksı Ata</button>
          <button className="btn btn-secondary" onClick={rebuildNames} disabled={selected.length === 0}>
            <RefreshCw size={17} />
            İsimleri Yeniden Oluştur
          </button>
          <button className="btn btn-primary" onClick={approveBulk} disabled={selected.length === 0}>
            <Save size={17} />
            Seçilenleri Onayla
          </button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Seç</th>
                <th className="px-4 py-3">Görsel</th>
                <th className="px-4 py-3">Barkod</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Eski Ürün Adı</th>
                <th className="px-4 py-3">Yeni SEO Ürün Adı</th>
                <th className="px-4 py-3">Aile</th>
                <th className="px-4 py-3">Boy</th>
                <th className="px-4 py-3">Saksı</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <button className="btn btn-secondary min-h-9 px-3" onClick={() => toggle(item.id)}>
                      {selected.includes(item.id) ? 'Seçili' : 'Seç'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {item.images[0] ? (
                      <button onClick={() => setPreviewImage(item.images[0])}>
                        <img src={imageUrl(item.images[0].url)} alt={item.oldProductName} className="h-14 w-14 rounded-md object-cover" />
                      </button>
                    ) : <span className="text-xs text-red-600">İnceleme gerekli</span>}
                  </td>
                  <td className="px-4 py-3">{item.barcode}</td>
                  <td className="px-4 py-3">{item.currentModelCode ?? '-'}</td>
                  <td className="px-4 py-3 font-semibold">{item.oldProductName}</td>
                  <td className="px-4 py-3 text-brand font-semibold">{item.seoProductName ?? '-'}</td>
                  <td className="px-4 py-3">{item.familyName ?? '-'}</td>
                  <td className="px-4 py-3">{item.size ?? '-'}</td>
                  <td className="px-4 py-3">{item.pot ?? '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.approvalStatus} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-primary min-h-9 px-3" onClick={() => openEditor(item)}>
                        Ürünü Düzenle
                      </button>
                      <button className="btn btn-secondary min-h-9 px-3" onClick={() => openEditor(item, 'Görseller')}>
                        <ImageIcon size={15} />
                        Görseller
                      </button>
                      {item.trendyolProductUrl ? (
                        <a className="btn btn-secondary min-h-9 px-3" href={item.trendyolProductUrl} target="_blank">
                          <ExternalLink size={15} />
                          Trendyol’da Aç
                        </a>
                      ) : <span className="text-xs text-red-600">Link yok</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/30">
          <aside className="ml-auto flex h-full w-full flex-col bg-white shadow-2xl lg:w-[65vw]">
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h3 className="text-lg font-bold">Ürünü Düzenle</h3>
                <p className="text-sm text-slate-500">{editing.barcode} · {editing.currentModelCode ?? 'Model kodu yok'}</p>
              </div>
              <button className="btn btn-secondary px-3" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>

            <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[120px_1fr]">
              <div>
                {editing.images[0] ? <img src={imageUrl(editing.images[0].url)} alt={editing.oldProductName} className="h-28 w-28 rounded-md object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">Görsel yok</div>}
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
                <Info label="Barkod" value={editing.barcode} />
                <Info label="Mevcut model kodu" value={editing.currentModelCode ?? '-'} />
                <Info label="Önerilen yeni model kodu" value={editing.proposedModelCode ?? '-'} />
                <Info label="Kategori" value={editing.mainCategory ?? '-'} />
                <Info label="Satış fiyatı" value={`${Number(editing.salePrice || 0).toLocaleString('tr-TR')} TL`} />
                <Info label="Stok bilgisi" value={`${editing.stockQuantity ?? 0} adet`} />
                <Info label="Eski ürün adı" value={editing.oldProductName} wide />
                <Info label="Trendyol linki" value={editing.trendyolProductUrl ? 'Bağlantı var' : 'İnceleme gerekli'} />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3">
              {tabs.map((tab) => (
                <button key={tab} className={`btn min-h-9 whitespace-nowrap px-3 ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'Ürün Bilgileri' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Ürün ailesi" value={editing.properties.familyName} onChange={(value) => updateProperties({ familyName: value })} />
                  <TextField label="Bitki/ağaç türü" value={editing.properties.plantType} onChange={(value) => updateProperties({ plantType: value })} />
                  <TextField label="Ürün yüksekliği, cm" value={editing.properties.heightCm} onChange={(value) => updateProperties({ heightCm: value })} />
                  <TextField label="Gövde türü" value={editing.properties.trunkType} onChange={(value) => updateProperties({ trunkType: value })} />
                  <TextField label="Gövde sayısı" value={editing.properties.trunkCount} onChange={(value) => updateProperties({ trunkCount: value })} />
                  <TextField label="Yaprak sayısı" value={editing.properties.leafCount} onChange={(value) => updateProperties({ leafCount: value })} />
                  <SelectField label="Saksı türü" value={editing.properties.potType} options={potOptions} onChange={(value) => updateProperties({ potType: value })} />
                  <TextField label="Saksı rengi" value={editing.properties.potColor} onChange={(value) => updateProperties({ potColor: value })} />
                  <SelectField label="Saksı şekli" value={editing.properties.potShape} options={['Kare', 'Dikdörtgen', 'Yuvarlak']} onChange={(value) => updateProperties({ potShape: value })} />
                  {normalize(editing.properties.potShape ?? '').includes('yuvarlak') ? (
                    <>
                      <TextField label="Saksı çapı, cm" value={editing.properties.potDiameterCm} onChange={(value) => updateProperties({ potDiameterCm: value })} />
                      <TextField label="Saksı yüksekliği, cm" value={editing.properties.potHeightCm} onChange={(value) => updateProperties({ potHeightCm: value })} />
                    </>
                  ) : (
                    <>
                      <TextField label="Saksı eni, cm" value={editing.properties.potWidthCm} onChange={(value) => updateProperties({ potWidthCm: value })} />
                      <TextField label="Saksı boyu/uzunluğu, cm" value={editing.properties.potLengthCm} onChange={(value) => updateProperties({ potLengthCm: value })} />
                      <TextField label="Saksı yüksekliği, cm" value={editing.properties.potHeightCm} onChange={(value) => updateProperties({ potHeightCm: value })} />
                    </>
                  )}
                  <TextField label="Ürün rengi" value={editing.properties.productColor} onChange={(value) => updateProperties({ productColor: value })} />
                  <TextField label="Kullanım alanı" value={editing.properties.usageArea} onChange={(value) => updateProperties({ usageArea: value })} />
                  <TextField label="Ek özellikler" value={editing.properties.extraFeatures} onChange={(value) => updateProperties({ extraFeatures: value })} wide />
                </div>
              )}

              {activeTab === 'Ürün Adı ve SEO' && (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <TextArea label="Eski Ürün Adı" value={editing.oldProductName} disabled />
                    <TextArea label="Önerilen Yeni Ürün Adı" value={editing.seoProductName} onChange={(value) => updateEditing({ seoProductName: value })} />
                    <TextArea label="Manuel Düzenlenmiş Ürün Adı" value={editing.manualProductName} onChange={(value) => updateEditing({ manualProductName: value })} />
                  </div>
                  <button className="btn btn-secondary" onClick={generateName}>
                    <Sparkles size={17} />
                    Ürün Adını Oluştur
                  </button>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="SEO ürün adı" value={editing.seoProductName} onChange={(value) => updateEditing({ seoProductName: value })} />
                    <TextField label="Pazaryeri ürün başlığı" value={editing.marketTitle} onChange={(value) => updateEditing({ marketTitle: value })} />
                    <TextField label="Web sitesi ürün başlığı" value={editing.webTitle} onChange={(value) => updateEditing({ webTitle: value })} />
                    <TextField label="Meta başlık" value={editing.metaTitle} onChange={(value) => updateEditing({ metaTitle: value })} />
                    <TextArea label="Meta açıklama" value={editing.metaDescription} onChange={(value) => updateEditing({ metaDescription: value })} />
                    <TextArea label="Anahtar kelimeler" value={editing.keywords.join(', ')} onChange={(value) => updateEditing({ keywords: value.split(',').map((item) => item.trim()).filter(Boolean) })} />
                    <TextField label="Görsel alt metni" value={editing.imageAltText} onChange={(value) => updateEditing({ imageAltText: value })} />
                  </div>
                  <button className="btn btn-primary" onClick={generateContent}>
                    <Sparkles size={17} />
                    SEO İçeriğini Oluştur
                  </button>
                </div>
              )}

              {activeTab === 'Açıklamalar' && (
                <div className="grid gap-4">
                  <TextArea label="Kısa açıklama" value={editing.shortDescription} onChange={(value) => updateEditing({ shortDescription: value })} />
                  <TextArea label="Uzun ürün açıklaması" value={editing.longDescription} onChange={(value) => updateEditing({ longDescription: value })} tall />
                  <button className="btn btn-secondary w-fit" onClick={generateContent}>
                    <RefreshCw size={17} />
                    Açıklamayı Ölçülerle Güncelle
                  </button>
                </div>
              )}

              {activeTab === 'Görseller' && (
                <div className="space-y-4">
                  <label className="btn btn-primary w-fit cursor-pointer">
                    <Upload size={17} />
                    Bilgisayardan Yeni Görsel Yükle
                    <input type="file" accept="image/*" className="hidden" onChange={uploadImage} />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    {editing.images.map((image, index) => (
                      <div key={`${image.url}-${index}`} className="rounded-md border border-line p-3">
                        <div className="grid gap-3 sm:grid-cols-[130px_1fr]">
                          <img src={imageUrl(image.url)} alt={image.fileName} className="h-32 w-full rounded-md object-cover" />
                          <div className="space-y-2 text-sm">
                            <div className="font-semibold">{image.fileName}</div>
                            <div className="text-slate-500">{image.isMain ? 'Ana görsel' : 'Ek görsel'} · {image.status}</div>
                            <div className="text-slate-500">Çözünürlük: Görsel açıldığında kontrol edilir</div>
                            <div className="flex flex-wrap gap-2">
                              <button className="btn btn-secondary min-h-9 px-3" onClick={() => imageAction(index, 'main', 'Ana görsel seçildi. Onaylayınca değişecek.')}>Ana Görsel Yap</button>
                              <label className="btn btn-secondary min-h-9 cursor-pointer px-3">
                                Görsel Değiştir
                                <input type="file" accept="image/*" className="hidden" onChange={uploadImage} />
                              </label>
                              <button className="btn btn-secondary min-h-9 px-3" onClick={() => imageAction(index, 'photoroom', 'PhotoRoom çıktısı oluşturuldu.', { mode: 'Pazaryeri Ana Görseli' })}>PhotoRoom ile Düzenle</button>
                              <button className="btn btn-secondary min-h-9 px-3" onClick={() => imageAction(index, 'photoroom', 'Erhan Flowers standardı uygulandı.', { mode: 'Beyaz Fon' })}>Standardı Uygula</button>
                              <button className="btn btn-secondary min-h-9 px-3" onClick={() => setPreviewImage(image)}><Eye size={15} /> Ön İzle</button>
                              <button className="btn btn-secondary min-h-9 px-3" onClick={() => imageAction(index, 'archive', 'Görsel arşivlendi.')}>Arşivle</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {editing.images.length === 0 && <div className="rounded-md border border-dashed border-line p-6 text-sm text-slate-500">Bu üründe görsel yok. İnceleme gerekli.</div>}
                  </div>
                </div>
              )}

              {activeTab === 'Ön İzleme ve Onay' && (
                <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
                  <div className="space-y-3">
                    {editing.images[0] && (
                      <div>
                        <div className="mb-1 text-xs font-semibold text-slate-500">Mevcut ana görsel</div>
                        <img src={imageUrl(editing.images[0].url)} alt={editing.imageAltText ?? editing.oldProductName} className="w-full rounded-md object-cover" />
                      </div>
                    )}
                    {editing.properties.pendingMainImageUrl && (
                      <div>
                        <div className="mb-1 text-xs font-semibold text-amber-700">Onay bekleyen yeni ana görsel</div>
                        <img src={imageUrl(editing.properties.pendingMainImageUrl)} alt="Onay bekleyen yeni ana görsel" className="w-full rounded-md border border-amber-200 object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xl font-bold">{editing.manualProductName || editing.seoProductName || editing.oldProductName}</h4>
                    <p className="text-sm text-slate-500">{editing.proposedModelCode ?? editing.currentModelCode} · {Number(editing.salePrice || 0).toLocaleString('tr-TR')} TL</p>
                    <p className="text-sm">{editing.shortDescription}</p>
                    <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm">{editing.longDescription}</pre>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-secondary" onClick={saveDraft}>Taslak Kaydet</button>
                      <button className="btn btn-primary" onClick={approveOne}>Onayla</button>
                      <button className="btn btn-secondary" onClick={generateContent}>Yeniden Oluştur</button>
                      <button className="btn btn-secondary" onClick={() => openEditor(editing)}>Değişiklikleri Geri Al</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4" onClick={() => setPreviewImage(null)}>
          <img src={imageUrl(previewImage.url)} alt={previewImage.fileName} className="max-h-[90vh] max-w-[90vw] rounded-md bg-white object-contain" />
        </div>
      )}
    </AdminShell>
  );
}

function editorPayload(item: SeoProduct) {
  return {
    proposedModelCode: item.proposedModelCode,
    properties: item.properties,
    seoProductName: item.seoProductName,
    manualProductName: item.manualProductName,
    marketTitle: item.marketTitle,
    webTitle: item.webTitle,
    shortDescription: item.shortDescription,
    longDescription: item.longDescription,
    metaTitle: item.metaTitle,
    metaDescription: item.metaDescription,
    keywords: item.keywords,
    imageAltText: item.imageAltText,
  };
}

function StatusBadge({ status }: { status: SeoProduct['approvalStatus'] }) {
  const color = status === 'Hazır Onay' ? 'bg-emerald-50 text-emerald-700' : status === 'Eksik Bilgi' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{status}</span>;
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? 'md:col-span-2' : ''}><div className="text-xs text-slate-500">{label}</div><div className="font-semibold">{value}</div></div>;
}

function TextField({ label, value, onChange, wide }: { label: string; value?: string | null; onChange: (value: string) => void; wide?: boolean }) {
  return <label className={`block space-y-1.5 ${wide ? 'md:col-span-2' : ''}`}><span className="label">{label}</span><input className="field" value={value ?? ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value?: string | null; options: string[]; onChange: (value: string) => void }) {
  return <label className="block space-y-1.5"><span className="label">{label}</span><select className="field" value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">Seç</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, disabled, tall }: { label: string; value?: string | null; onChange?: (value: string) => void; disabled?: boolean; tall?: boolean }) {
  return <label className="block space-y-1.5"><span className="label">{label}</span><textarea className={`field ${tall ? 'min-h-80' : 'min-h-24'}`} value={value ?? ''} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} /></label>;
}

function imageUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return apiFileUrl(url);
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}
