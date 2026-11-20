/** Sipariş formu doğrulamaları (site + sunucu tarafı aynı kurallar). */

/** "0532 123 45 67", "+90 532…", "5321234567" → "5321234567" (10 hane) ya da null */
export function normalizeTrPhone(raw: string): string | null {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.startsWith('90') && d.length === 12) d = d.slice(2)
  if (d.startsWith('0') && d.length === 11) d = d.slice(1)
  return /^[2-5]\d{9}$/.test(d) ? d : null
}

/** Gerçek görünümlü Türkiye telefonu mu? (0000000, 1234567, tekrar eden rakamlar reddedilir) */
export function isValidTrPhone(raw: string): boolean {
  const d = normalizeTrPhone(raw)
  if (!d) return false
  const subscriber = d.slice(3)
  if (/^(\d)\1{6}$/.test(subscriber)) return false // 532 000 00 00, 555 555 55 55
  if (/(\d)\1{5,}/.test(d)) return false
  if (['1234567', '7654321', '0123456'].includes(subscriber)) return false
  return true
}

/** T.C. Kimlik No algoritma kontrolü */
export function isValidTcKimlik(raw: string): boolean {
  const s = String(raw ?? '').trim()
  if (!/^[1-9]\d{10}$/.test(s)) return false
  if (/^(\d)\1{9}/.test(s)) return false // 11111111110 gibi deneme numaraları
  const d = s.split('').map(Number)
  const odd = d[0] + d[2] + d[4] + d[6] + d[8]
  const even = d[1] + d[3] + d[5] + d[7]
  const d10 = (((odd * 7 - even) % 10) + 10) % 10
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10
  return d[9] === d10 && d[10] === d11
}
