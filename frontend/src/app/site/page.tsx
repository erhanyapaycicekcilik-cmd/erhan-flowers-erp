import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  Flower2,
  Instagram,
  Leaf,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  Trees,
} from 'lucide-react';
import { fetchPublicProducts, fetchPublicCategories, productImageUrl, formatSitePrice } from './site-data';

export const metadata: Metadata = {
  title: 'Erhan Flowers Store | Yapay Çiçek ve Dekoratif Aranjman',
  description:
    'Erhan Flowers Store; yapay çiçek, kuru çiçek, dekoratif aranjman ve kurumsal mekan uygulamaları için sade, kaliteli ve ürün odaklı vitrin.',
};

const whatsappHref = 'https://wa.me/905446546220';
const instagramHref = 'https://www.instagram.com/erhanflowers';

const categoryRail = [
  { label: 'Yapay Ağaç', image: '/site-products/ficus-white.png' },
  { label: 'Salon', image: '/site-products/ficus-living.png' },
  { label: 'Ofis & Lobi', image: '/site-products/ficus-lobby.png' },
  { label: 'Saksı', image: '/site-products/ficus-studio.png' },
  { label: 'Detay', image: '/site-products/ficus-detail.png' },
  { label: 'Özel Ölçü', image: '/site-products/ficus-scale.png' },
];

const featuredCards = [
  {
    eyebrow: 'Yeni vitrin',
    title: 'Yapay Ficus Ağaç',
    description: 'Gerçekçi yaprak dokusu, siyah silindir saksı ve beyaz taş yüzeyle premium görünüm.',
    image: '/site-products/ficus-white.png',
    tone: 'light',
  },
  {
    eyebrow: 'Mekan etkisi',
    title: 'Modern Salon Düzeni',
    description: 'Sade renkli yaşam alanlarında sıcak ve kalıcı yeşil vurgu.',
    image: '/site-products/ficus-living.png',
    tone: 'image',
  },
  {
    eyebrow: 'Kurumsal',
    title: 'Ofis ve Lobi Uygulaması',
    description: 'Karşılama alanları, showroom ve otel lobileri için güçlü ilk izlenim.',
    image: '/site-products/ficus-lobby.png',
    tone: 'image',
  },
  {
    eyebrow: 'Yakından kalite',
    title: 'Yaprak ve Dal Detayı',
    description: 'Dolu hacim, dengeli form ve doğal ışıkta gerçekçi duruş.',
    image: '/site-products/ficus-detail.png',
    tone: 'light',
  },
];

const collections = [
  {
    title: 'Yapay Çiçek',
    text: 'Bakım istemeyen, yıl boyunca formunu koruyan dekoratif ağaç ve bitkiler.',
    icon: Flower2,
  },
  {
    title: 'Kuru Çiçek',
    text: 'Doğal tonlu, sıcak ve uzun ömürlü masa, vazo ve köşe aranjmanları.',
    icon: Leaf,
  },
  {
    title: 'Dekoratif Aranjman',
    text: 'Hediye, mağaza vitrini ve özel alanlar için hazır kompozisyonlar.',
    icon: Sparkles,
  },
  {
    title: 'Kurumsal Mekan',
    text: 'Otel, restoran, ofis ve lobi alanları için ölçülü uygulamalar.',
    icon: Building2,
  },
];

const advantages = [
  'Gerçekçi görünüm',
  'Mekan ölçüsüne göre seçim',
  'Manavgat / Antalya hızlı iletişim',
  'Kurumsal ve bireysel hazırlık',
];

export default async function SitePage() {
  const [products, categories] = await Promise.all([fetchPublicProducts(), fetchPublicCategories()]);
  const featured = products.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#f5f5f2] text-[#1d1d1f]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f7f7f4]/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/site" className="flex items-center gap-2" aria-label="Erhan Flowers Store">
            <Image src="/logo-erhan-flowers.png" alt="Erhan Flowers" width={120} height={62} className="h-8 w-auto object-contain" priority />
          </Link>
          <nav className="hidden items-center gap-8 text-xs font-medium text-[#313136] md:flex">
            <a href="#urunler" className="hover:text-[#0f5f3c]">Ürünler</a>
            <a href="#koleksiyonlar" className="hover:text-[#0f5f3c]">Koleksiyonlar</a>
            <a href="#kurumsal" className="hover:text-[#0f5f3c]">Kurumsal</a>
            <a href="#iletisim" className="hover:text-[#0f5f3c]">İletişim</a>
          </nav>
          <div className="flex items-center gap-4 text-[#313136]">
            <Search size={17} aria-hidden="true" />
            <ShoppingBag size={17} aria-hidden="true" />
            <Link href="/login" className="text-xs font-medium hover:text-[#0f5f3c]">Panel</Link>
          </div>
        </div>
      </header>

      <div className="border-b border-black/5 bg-white px-5 py-3 text-center text-sm">
        Erhan Flowers ürünleri için ölçü, renk ve mekan fotoğrafınızı paylaşın.{' '}
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="font-semibold text-[#0066cc]">
          WhatsApp ile görüşün <ArrowUpRight className="inline" size={13} />
        </a>
      </div>

      <section className="mx-auto max-w-7xl px-5 pb-10 pt-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div>
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0f5f3c]">
              <MapPin size={16} />
              Manavgat / Antalya
            </p>
            <h1 className="text-6xl font-bold leading-none tracking-normal text-[#1d1d1f] sm:text-7xl lg:text-8xl">
              Store.
            </h1>
            <p className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-[#6e6e73] sm:text-4xl">
              Ürün odaklı, sade ve kalıcı çiçek dekorasyonu.
            </p>
          </div>
          <aside className="space-y-5 pt-2">
            <div>
              <h2 className="text-2xl font-bold leading-tight">Mekanınıza en yakışan ürünü birlikte seçelim.</h2>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0066cc]">
                Bir uzmanla görüşün <ArrowUpRight size={14} />
              </a>
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight">Instagram’da yeni aranjmanları görün.</h2>
              <a href={instagramHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0066cc]">
                @ERHANFLOWERS <ArrowUpRight size={14} />
              </a>
            </div>
          </aside>
        </div>

        <div className="mt-16 overflow-x-auto pb-4">
          <div className="flex min-w-max gap-8">
            {(categories.length > 0
              ? categories.map((cat) => ({ label: cat.name, image: productImageUrl(products.find((p) => p.categorySlug === cat.slug)?.images[0]), href: `#urunler-${cat.slug}` }))
              : categoryRail.map((item) => ({ label: item.label, image: item.image, href: '#urunler' }))
            ).map((item) => (
              <a key={item.label} href={item.href} className="group w-32 text-center">
                <div className="mx-auto flex h-24 w-28 items-end justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.label} className="max-h-24 w-auto object-contain transition group-hover:scale-[1.03]" />
                </div>
                <div className="mt-3 text-sm font-semibold">{item.label}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="urunler" className="px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-bold">
              Son çıkanlar. <span className="text-[#6e6e73]">Kaliteyi yakından görün.</span>
            </h2>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="hidden text-sm font-semibold text-[#0066cc] sm:inline-flex">
              Teklif al <ArrowUpRight className="ml-1" size={14} />
            </a>
          </div>

          {featured.length > 0 ? (
            <div className="flex gap-5 overflow-x-auto pb-6">
              {featured.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/site/urun/${product.id}`}
                  className={`relative h-[520px] w-[340px] shrink-0 overflow-hidden rounded-lg ${
                    index % 2 === 1 ? 'bg-[#111] text-white' : 'bg-white text-[#1d1d1f]'
                  } shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:w-[400px]`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {index % 2 === 1 && <img src={productImageUrl(product.images[0])} alt={product.name} className="absolute inset-0 h-full w-full object-cover opacity-70" />}
                  {index % 2 === 1 && <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.72),rgba(0,0,0,0.18),rgba(0,0,0,0.05))]" />}
                  <div className="relative z-10 p-7">
                    <p className={`text-xs font-bold uppercase ${index % 2 === 1 ? 'text-[#9bd0a9]' : 'text-[#b45600]'}`}>{product.category ?? 'Ürün'}</p>
                    <h3 className="mt-3 text-3xl font-bold leading-tight">{product.name}</h3>
                    <p className={`mt-3 max-w-sm text-sm leading-6 ${index % 2 === 1 ? 'text-white/86' : 'text-[#3b3b3f]'}`}>{formatSitePrice(product.salePrice)}</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {index % 2 !== 1 && (
                    <img src={productImageUrl(product.images[0])} alt={product.name} className="absolute bottom-0 left-1/2 h-[330px] w-full -translate-x-1/2 object-contain" />
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-6">
              {featuredCards.map((card) => (
                <article
                  key={card.title}
                  className={`relative h-[520px] w-[340px] shrink-0 overflow-hidden rounded-lg ${
                    card.tone === 'image' ? 'bg-[#111] text-white' : 'bg-white text-[#1d1d1f]'
                  } shadow-[0_10px_30px_rgba(0,0,0,0.08)] sm:w-[400px]`}
                >
                  {card.tone === 'image' && <Image src={card.image} alt={card.title} width={720} height={720} className="absolute inset-0 h-full w-full object-cover opacity-70" />}
                  {card.tone === 'image' && <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.72),rgba(0,0,0,0.18),rgba(0,0,0,0.05))]" />}
                  <div className="relative z-10 p-7">
                    <p className={`text-xs font-bold uppercase ${card.tone === 'image' ? 'text-[#9bd0a9]' : 'text-[#b45600]'}`}>{card.eyebrow}</p>
                    <h3 className="mt-3 text-3xl font-bold leading-tight">{card.title}</h3>
                    <p className={`mt-3 max-w-sm text-sm leading-6 ${card.tone === 'image' ? 'text-white/86' : 'text-[#3b3b3f]'}`}>{card.description}</p>
                  </div>
                  {card.tone !== 'image' && (
                    <Image src={card.image} alt={card.title} width={720} height={720} className="absolute bottom-0 left-1/2 h-[330px] w-full -translate-x-1/2 object-contain" />
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {categories.map((cat) => {
        const catProducts = products.filter((p) => p.categorySlug === cat.slug);
        if (catProducts.length === 0) return null;
        return (
          <section key={cat.slug} id={`urunler-${cat.slug}`} className="px-5 py-8 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <h2 className="mb-6 text-3xl font-bold">
                {cat.name}. <span className="text-[#6e6e73]">{cat.count} ürün.</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {catProducts.map((product) => (
                  <Link key={product.id} href={`/site/urun/${product.id}`} className="group rounded-lg bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
                    <div className="flex h-48 items-center justify-center overflow-hidden rounded-md bg-[#f5f5f2]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={productImageUrl(product.images[0])} alt={product.name} className="h-full w-full object-contain transition group-hover:scale-[1.03]" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold leading-snug">{product.name}</h3>
                    <p className="mt-2 text-sm font-bold text-[#0f5f3c]">{formatSitePrice(product.salePrice)}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section id="koleksiyonlar" className="px-5 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-6 text-3xl font-bold">
            Koleksiyonlar. <span className="text-[#6e6e73]">Her alan için net seçim.</span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {collections.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-lg bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#eef4ec] text-[#0f5f3c]">
                    <Icon size={23} />
                  </div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6e6e73]">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="kurumsal" className="px-5 py-8 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="relative min-h-[560px] overflow-hidden rounded-lg bg-[#111] text-white">
            <Image src="/site-products/ficus-lobby.png" alt="Kurumsal lobi yapay bitki uygulaması" width={1200} height={900} className="absolute inset-0 h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.18))]" />
            <div className="relative z-10 flex min-h-[560px] max-w-xl flex-col justify-between p-8 sm:p-10">
              <div>
                <p className="text-xs font-bold uppercase text-[#9bd0a9]">Kurumsal kalite</p>
                <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">Otel, ofis ve mağazalarda güçlü ilk izlenim.</h2>
                <p className="mt-4 text-base leading-7 text-white/86">
                  Ürün seçimi; ışık, alan yüksekliği, zemin tonu ve kullanım trafiğine göre yapılır.
                </p>
              </div>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-[#1d1d1f] hover:bg-[#eef4ec]">
                Kurumsal teklif alın <MessageCircle size={18} />
              </a>
            </div>
          </article>

          <aside className="grid gap-5">
            <article className="rounded-lg bg-white p-7 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
              <Trees className="text-[#0f5f3c]" size={30} />
              <h3 className="mt-5 text-2xl font-bold">Dolu görünüm, sade sunum.</h3>
              <p className="mt-3 text-sm leading-7 text-[#6e6e73]">
                Kalite hissi ürün kalabalığından değil, doğru form, doğru saksı ve temiz sunumdan gelir.
              </p>
            </article>
            <article className="rounded-lg bg-[#102019] p-7 text-white">
              <h3 className="text-2xl font-bold">Erhan Flowers hizmet notları</h3>
              <div className="mt-5 grid gap-3">
                {advantages.map((item) => (
                  <div key={item} className="rounded-md border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </div>
      </section>

      <section id="iletisim" className="px-5 py-8 pb-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 rounded-lg bg-white p-7 shadow-[0_10px_30px_rgba(0,0,0,0.06)] lg:grid-cols-[1fr_320px] lg:p-9">
          <div>
            <p className="text-xs font-bold uppercase text-[#0f5f3c]">İletişim</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-tight">Ürünü seçin, ölçüyü paylaşın, birlikte netleştirelim.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6e6e73]">
              Sarılar Mahallesi Cumhuriyet Caddesi No: 52, Manavgat / Antalya. Web: www.erhanflowers.com
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#0f5f3c] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b4b30]">
                <Phone size={18} />
                0544 654 62 20
              </a>
              <a href={instagramHref} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-black/10 px-5 py-3 text-sm font-bold hover:border-[#0f5f3c]">
                <Instagram size={18} />
                @ERHANFLOWERS
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-lg bg-[#f5f5f2] p-5">
            <Image src="/instagram-qr.jpg" alt="Erhan Flowers Instagram QR kodu" width={220} height={280} className="h-auto w-44 rounded-md bg-white object-contain p-2" />
          </div>
        </div>
      </section>
    </main>
  );
}
