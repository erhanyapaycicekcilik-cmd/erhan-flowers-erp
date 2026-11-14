import { timingSafeEqual } from 'crypto';

// Site yönetim uç noktaları (public/catalog/admin/*, public/catalog/groups/admin/*) için gizli anahtar.
// Önceden REVALIDATE_SECRET tanımlı değilse koddaki 'dev-secret-local' geçerliydi (herkes bilebilirdi).
// Artık: REVALIDATE_SECRET → yoksa site ile ortak anahtar (SITE_INTERNAL_KEY / TAMI_SECRET_KEY).
// Hiçbiri yoksa canlıda bu uç noktalar KAPALI; yerel geliştirmede 'dev-secret-local' çalışır.
export function adminSecret(): string {
  const own = (process.env.REVALIDATE_SECRET || '').trim();
  if (own && own !== 'dev-secret-local') return own;
  const shared = (process.env.SITE_INTERNAL_KEY || process.env.TAMI_SECRET_KEY || '').trim();
  if (shared) return shared;
  return process.env.NODE_ENV === 'production' ? '' : 'dev-secret-local';
}

export function isValidAdminSecret(given?: string | null): boolean {
  const key = adminSecret();
  if (!key || !given) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
