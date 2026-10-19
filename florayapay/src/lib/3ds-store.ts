import { randomUUID } from 'crypto'

const store = new Map<string, { html: string; created: number }>()
const TTL = 5 * 60 * 1000

export function store3dsHtml(html: string): string {
  const token = randomUUID()
  store.set(token, { html, created: Date.now() })
  for (const [k, v] of store) {
    if (Date.now() - v.created > TTL) store.delete(k)
  }
  return token
}

export function get3dsHtml(token: string): string | null {
  const entry = store.get(token)
  if (!entry) return null
  if (Date.now() - entry.created > TTL) {
    store.delete(token)
    return null
  }
  store.delete(token)
  return entry.html
}
