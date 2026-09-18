const badges = [
  { icon: '🚚', title: 'Hızlı Kargo', desc: '2 iş günü teslimat' },
  { icon: '↩️', title: 'Kolay İade', desc: '14 gün iade garantisi' },
  { icon: '🔒', title: 'Güvenli Ödeme', desc: 'SSL şifreli işlem' },
  { icon: '🌿', title: 'Kalite Garantisi', desc: 'Premium malzeme' },
]

export function TrustBadges() {
  return (
    <section className="border-y border-gray-100 bg-white py-8" aria-label="Güven göstergeleri">
      <div className="max-w-screen-2xl mx-auto px-4">
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((b) => (
            <li key={b.title} className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{b.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{b.title}</p>
                <p className="text-xs text-gray-500">{b.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
