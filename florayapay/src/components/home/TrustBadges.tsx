const badges = [
  { icon: '🚚', title: 'Hızlı Kargo', desc: '2 iş günü teslimat' },
  { icon: '↩️', title: 'Kolay İade', desc: '14 gün iade garantisi' },
  { icon: '🔒', title: 'Güvenli Ödeme', desc: 'SSL şifreli işlem' },
  { icon: '🌿', title: 'Kalite Garantisi', desc: 'Premium malzeme' },
]

export function TrustBadges() {
  return (
    <section className="bg-white border-b border-[#E0DDD4]" aria-label="Güven göstergeleri">
      <ul className="max-w-screen-2xl mx-auto px-3 py-2.5 flex md:justify-center gap-4 md:gap-10 overflow-x-auto [scrollbar-width:none]">
        {badges.map((b) => (
          <li key={b.title} className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[#3A3A34]">
            <span aria-hidden="true">{b.icon}</span>
            <span className="font-semibold">{b.title}</span>
            <span className="text-[#8C8A82] hidden sm:inline">· {b.desc}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
