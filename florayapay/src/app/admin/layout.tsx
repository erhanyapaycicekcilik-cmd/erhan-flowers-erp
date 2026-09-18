import Link from 'next/link'
import { adminLogout } from '@/app/admin/actions'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F2EC]">
      {/* Admin header */}
      <header className="bg-[#0D1510] text-[#F4F2EC] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-display text-lg font-light">
            Flora<em className="not-italic text-[#7AB88A]">Admin</em>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/admin" className="px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-colors">
              Panel
            </Link>
            <Link href="/admin/urunler" className="px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-colors">
              Ürünler
            </Link>
            <Link href="/admin/urun-ekle" className="px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-colors">
              Ürün Ekle
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Siteyi Gör ↗
          </Link>
          <form action={adminLogout}>
            <button type="submit" className="text-xs text-white/50 hover:text-red-400 transition-colors">
              Çıkış
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
