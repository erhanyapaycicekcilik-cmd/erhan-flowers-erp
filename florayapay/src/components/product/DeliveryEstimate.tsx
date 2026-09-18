'use client'

import { useMemo } from 'react'

export function DeliveryEstimate() {
  const deliveryDate = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    // If ordered before 14:00 → next business day, else +2 days
    const daysToAdd = hour < 14 ? 1 : 2
    const d = new Date(now)
    d.setDate(d.getDate() + daysToAdd)
    // Skip weekends
    if (d.getDay() === 6) d.setDate(d.getDate() + 2)
    if (d.getDay() === 0) d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
  }, [])

  const cutoffPassed = new Date().getHours() >= 14

  return (
    <div className="bg-[#F0F7F2] border border-[#C5DEC9] rounded-xl px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-lg">🚚</span>
        <div>
          <p className="font-semibold text-[#1E3A28]">
            {cutoffPassed
              ? `${deliveryDate} teslimat tahmini`
              : `Bugün saat 14:00'e kadar sipariş ver → ${deliveryDate} teslim`
            }
          </p>
          {!cutoffPassed && (
            <p className="text-[#5C7A62] text-xs mt-0.5">
              Kargo bugün yola çıkar ✓
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
