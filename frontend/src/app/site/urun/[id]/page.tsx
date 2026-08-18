import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { fetchPublicProduct, productImageUrl, formatSitePrice, whatsappOrderHref } from '../../site-data';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchPublicProduct(Number(id));
  if (!product) return { title: 'Ürün bulunamadı | Erhan Flowers Store' };
  return {
    title: `${product.name} | Erhan Flowers Store`,
    description: product.shortDescription ?? undefined,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await fetchPublicProduct(Number(id));
  if (!product) notFound();

  const images = product.images.length > 0 ? product.images : [undefined];

  return (
    <main className="min-h-screen bg-[#f5f5f2] text-[#1d1d1f]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f7f7f4]/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/site" className="flex items-center gap-2" aria-label="Erhan Flowers Store">
            <Image src="/logo-erhan-flowers.png" alt="Erhan Flowers" width={120} height={62} className="h-8 w-auto object-contain" priority />
          </Link>
          <Link href="/site" className="inline-flex items-center gap-1 text-xs font-medium text-[#313136] hover:text-[#0f5f3c]">
            <ArrowLeft size={15} /> Tüm ürünler
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex h-[420px] items-center justify-center overflow-hidden rounded-lg bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImageUrl(images[0])} alt={product.name} className="h-full w-full object-contain p-8" />
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto">
                {images.map((image, index) => (
                  <div key={index} className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={productImageUrl(image)} alt={`${product.name} görsel ${index + 1}`} className="h-full w-full object-contain p-2" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.category && <p className="text-xs font-bold uppercase text-[#0f5f3c]">{product.category}</p>}
            <h1 className="mt-3 text-4xl font-bold leading-tight">{product.name}</h1>
            <p className="mt-4 text-3xl font-bold text-[#1d1d1f]">{formatSitePrice(product.salePrice)}</p>
            <p className="mt-2 text-sm font-semibold text-[#0f5f3c]">{product.inStock ? 'Stokta mevcut' : 'Stok bekleniyor'}</p>

            {product.shortDescription && <p className="mt-6 text-base leading-7 text-[#3b3b3f]">{product.shortDescription}</p>}
            {product.description && <p className="mt-4 text-sm leading-7 text-[#6e6e73]">{product.description}</p>}
            {product.technicalSpecs && (
              <div className="mt-6 rounded-lg bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
                <h2 className="text-sm font-bold uppercase text-[#6e6e73]">Teknik Özellikler</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#3b3b3f]">{product.technicalSpecs}</p>
              </div>
            )}

            <a
              href={whatsappOrderHref(product)}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0f5f3c] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b4b30] sm:w-auto"
            >
              <MessageCircle size={18} />
              WhatsApp ile sipariş ver
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
