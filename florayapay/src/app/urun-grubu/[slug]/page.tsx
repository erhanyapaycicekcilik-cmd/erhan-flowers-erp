import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getProductGroup, getImageUrl } from '@/lib/api/catalog'
import { ProductGroupConfigurator } from '@/components/product/ProductGroupConfigurator'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const group = await getProductGroup(params.slug)
  if (!group) return { title: 'Ürün Bulunamadı' }
  return {
    title: group.name,
    description: group.description || `${group.name} — boy ve saksı seçenekleriyle yapay çiçek`,
    alternates: { canonical: `/urun-grubu/${params.slug}` },
  }
}

export default async function ProductGroupPage({ params }: PageProps) {
  const group = await getProductGroup(params.slug)
  if (!group) notFound()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F4F2EC]">
        <ProductGroupConfigurator group={group} />
      </main>
      <Footer />
    </>
  )
}
