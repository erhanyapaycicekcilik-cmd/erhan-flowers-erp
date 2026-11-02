'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

function fmt(n: number) {
  return '₺' + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function statusLabel(s: string) {
  return { PENDING: 'Beklemede', CONFIRMED: 'Onaylandı', PREPARING: 'Hazırlanıyor', SHIPPED: 'Kargoda', DELIVERED: 'Teslim Edildi', CANCELLED: 'İptal' }[s] || s
}
function statusColor(s: string) {
  return { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', PREPARING: 'bg-purple-100 text-purple-800', SHIPPED: 'bg-indigo-100 text-indigo-800', DELIVERED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800' }[s] || 'bg-gray-100 text-gray-800'
}

interface Musteri { id: number; firstName: string; lastName: string; email: string; phone?: string; birthDate?: string; city?: string; district?: string; address?: string; postalCode?: string }
interface Siparis { id: number; orderNumber: string; status: string; grandTotal: number; createdAt: string; paymentMethod: string; items: { productName: string; quantity: number; lineTotal: number }[] }

export default function HesabimPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [musteri, setMusteri] = useState<Musteri | null>(null)
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [yuklenIyor, setYuklenIyor] = useState(true)
  const [aktifSekme, setAktifSekme] = useState<'siparisler' | 'profil' | 'iade'>('siparisler')

  // Giriş formu
  const [girisForm, setGirisForm] = useState({ email: '', sifre: '' })
  const [girisHata, setGirisHata] = useState('')
  const [girisLoading, setGirisLoading] = useState(false)

  // Profil düzenle
  const [profilForm, setProfilForm] = useState<Partial<Musteri & { dogumTarihi: string }>>({})
  const [profilKaydedildi, setProfilKaydedildi] = useState(false)

  // İade
  const [iadeForm, setIadeForm] = useState({ siparisNo: '', urun: '', neden: '', detay: '' })
  const [iadeSonuc, setIadeSonuc] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wc_session')
      if (saved) {
        const s = JSON.parse(saved)
        setToken(s.token)
        setMusteri(s)
        yukle(s.token)
      } else {
        setYuklenIyor(false)
      }
    } catch { setYuklenIyor(false) }
  }, [])

  async function yukle(t: string) {
    setYuklenIyor(true)
    try {
      const [mRes, sRes] = await Promise.all([
        fetch('/api/web-customers/me', { headers: { authorization: `Bearer ${t}` } }),
        fetch('/api/web-customers/me/orders', { headers: { authorization: `Bearer ${t}` } }),
      ])
      if (mRes.ok) {
        const m = await mRes.json()
        setMusteri(m)
        setProfilForm({ ...m, dogumTarihi: m.birthDate ? m.birthDate.slice(0, 10) : '' })
        localStorage.setItem('wc_session', JSON.stringify({ ...m, token: t }))
      }
      if (sRes.ok) setSiparisler(await sRes.json())
    } catch {}
    setYuklenIyor(false)
  }

  async function girisYap() {
    setGirisLoading(true); setGirisHata('')
    try {
      const r = await fetch('/api/web-customers/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: girisForm.email, password: girisForm.sifre }),
      })
      const d = await r.json()
      if (!r.ok) { setGirisHata(d.message || 'Giriş başarısız'); return }
      const t = d.token
      setToken(t)
      localStorage.setItem('wc_session', JSON.stringify({ ...d.customer, token: t }))
      yukle(t)
    } catch { setGirisHata('Bağlantı hatası') }
    finally { setGirisLoading(false) }
  }

  async function profilKaydet() {
    if (!token) return
    try {
      const r = await fetch('/api/web-customers/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...profilForm, birthDate: profilForm.dogumTarihi || undefined }),
      })
      if (r.ok) { setProfilKaydedildi(true); setTimeout(() => setProfilKaydedildi(false), 3000) }
    } catch {}
  }

  function cikis() {
    localStorage.removeItem('wc_session')
    setToken(null); setMusteri(null); setSiparisler([])
  }

  function iadeGonder() {
    if (!iadeForm.siparisNo || !iadeForm.neden) return
    const msg = `İade Talebi\nSipariş No: ${iadeForm.siparisNo}\nÜrün: ${iadeForm.urun}\nNeden: ${iadeForm.neden}\nDetay: ${iadeForm.detay}`
    window.open(`https://wa.me/905446546220?text=${encodeURIComponent(msg)}`, '_blank')
    setIadeSonuc('İade talebiniz WhatsApp ile gönderildi. En kısa sürede dönüş yapacağız.')
  }

  if (yuklenIyor) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F4F2EC] flex items-center justify-center">
          <div className="text-[#8C8A82]">Yükleniyor...</div>
        </main>
        <Footer />
      </>
    )
  }

  if (!token || !musteri) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#F4F2EC] py-16 px-4">
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-[#E0DDD4] p-8">
            <h1 className="font-display text-2xl font-light text-[#0D1510] mb-2">Hesabım</h1>
            <p className="text-sm text-[#8C8A82] mb-6">Siparişlerinizi takip etmek ve iade talebi oluşturmak için giriş yapın.</p>
            {girisHata && <p className="text-sm text-red-600 mb-4">{girisHata}</p>}
            <div className="space-y-3">
              <input type="email" placeholder="E-posta" value={girisForm.email}
                onChange={e => setGirisForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
              <input type="password" placeholder="Şifre" value={girisForm.sifre}
                onChange={e => setGirisForm(f => ({ ...f, sifre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && girisYap()}
                className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
              <button onClick={girisYap} disabled={girisLoading}
                className="w-full py-3 bg-[#0D1510] text-white rounded-xl font-semibold disabled:opacity-50">
                {girisLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </div>
            <p className="text-center text-sm text-[#8C8A82] mt-4">
              Henüz üye değil misiniz?{' '}
              <Link href="/siparis" className="text-[#0D1510] underline">Sipariş verirken üye olun</Link>
            </p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC] py-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl font-light text-[#0D1510]">Hesabım</h1>
              <p className="text-sm text-[#8C8A82]">{musteri.email}</p>
            </div>
            <button onClick={cikis} className="text-sm text-[#8C8A82] underline hover:text-red-500">Çıkış Yap</button>
          </div>

          {/* Sekmeler */}
          <div className="flex gap-2 mb-6 border-b border-[#E0DDD4]">
            {([['siparisler', 'Siparişlerim'], ['profil', 'Profil Bilgileri'], ['iade', 'İade Talebi']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setAktifSekme(k)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${aktifSekme === k ? 'border-[#0D1510] text-[#0D1510]' : 'border-transparent text-[#8C8A82] hover:text-[#0D1510]'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Siparişlerim */}
          {aktifSekme === 'siparisler' && (
            <div className="space-y-4">
              {siparisler.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E0DDD4] p-8 text-center text-[#8C8A82]">
                  Henüz siparişiniz bulunmuyor.
                </div>
              ) : siparisler.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-[#E0DDD4] p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[#0D1510]">#{s.orderNumber}</p>
                      <p className="text-xs text-[#8C8A82]">{new Date(s.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor(s.status)}`}>{statusLabel(s.status)}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {s.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-[#4A4843]">
                        <span>{i.productName} x{i.quantity}</span>
                        <span>{fmt(Number(i.lineTotal))}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#F0EDE4]">
                    <span className="text-sm text-[#8C8A82]">{s.paymentMethod === 'EFT' ? 'EFT/Havale' : s.paymentMethod === 'ONLINE' ? 'Kredi Kartı' : 'WhatsApp'}</span>
                    <span className="font-bold text-[#0D1510]">{fmt(Number(s.grandTotal))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Profil */}
          {aktifSekme === 'profil' && (
            <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6 space-y-4 max-w-lg">
              {profilKaydedildi && <p className="text-sm text-green-600 font-semibold">✓ Kaydedildi</p>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#8C8A82] mb-1 block">Ad</label>
                  <input value={profilForm.firstName || ''} onChange={e => setProfilForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[#8C8A82] mb-1 block">Soyad</label>
                  <input value={profilForm.lastName || ''} onChange={e => setProfilForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#8C8A82] mb-1 block">Telefon</label>
                <input type="tel" value={profilForm.phone || ''} onChange={e => setProfilForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#8C8A82] mb-1 block">Doğum Tarihi</label>
                <input type="date" value={profilForm.dogumTarihi || ''} onChange={e => setProfilForm(f => ({ ...f, dogumTarihi: e.target.value }))}
                  className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#8C8A82] mb-1 block">Şehir</label>
                <input value={profilForm.city || ''} onChange={e => setProfilForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#8C8A82] mb-1 block">İlçe</label>
                <input value={profilForm.district || ''} onChange={e => setProfilForm(f => ({ ...f, district: e.target.value }))}
                  className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#8C8A82] mb-1 block">Adres</label>
                <textarea rows={2} value={profilForm.address || ''} onChange={e => setProfilForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm resize-none" />
              </div>
              <button onClick={profilKaydet}
                className="w-full py-3 bg-[#0D1510] text-white rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors">
                Kaydet
              </button>
            </div>
          )}

          {/* İade */}
          {aktifSekme === 'iade' && (
            <div className="bg-white rounded-2xl border border-[#E0DDD4] p-6 max-w-lg space-y-4">
              <p className="text-sm text-[#8C8A82]">İade talebinizi aşağıdaki formu doldurup WhatsApp üzerinden gönderin. En kısa sürede size dönüş yapacağız.</p>
              {iadeSonuc ? (
                <p className="text-sm text-green-700 font-semibold">{iadeSonuc}</p>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-[#8C8A82] mb-1 block">Sipariş No *</label>
                    <input value={iadeForm.siparisNo} onChange={e => setIadeForm(f => ({ ...f, siparisNo: e.target.value }))}
                      placeholder="WEB-XXXXX" className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-[#8C8A82] mb-1 block">Ürün Adı</label>
                    <input value={iadeForm.urun} onChange={e => setIadeForm(f => ({ ...f, urun: e.target.value }))}
                      placeholder="İade etmek istediğiniz ürün" className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-[#8C8A82] mb-1 block">İade Nedeni *</label>
                    <select value={iadeForm.neden} onChange={e => setIadeForm(f => ({ ...f, neden: e.target.value }))}
                      className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm bg-white">
                      <option value="">Seçiniz</option>
                      <option>Ürün hasarlı geldi</option>
                      <option>Yanlış ürün geldi</option>
                      <option>Ürün beklentimi karşılamadı</option>
                      <option>Vazgeçtim</option>
                      <option>Diğer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#8C8A82] mb-1 block">Ek Açıklama</label>
                    <textarea rows={3} value={iadeForm.detay} onChange={e => setIadeForm(f => ({ ...f, detay: e.target.value }))}
                      className="w-full border border-[#D4D0C7] rounded-xl px-4 py-2.5 text-sm resize-none" />
                  </div>
                  <button onClick={iadeGonder}
                    className="w-full py-3 bg-[#0D1510] text-white rounded-xl font-semibold hover:bg-[#1E3A28] transition-colors">
                    WhatsApp ile İade Talebi Gönder
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
