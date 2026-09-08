// ERP ürün/fiyat değişince FloraYapayCiçek sitesini anında günceller.
// SITE_REVALIDATE_URL ve SITE_REVALIDATE_SECRET env değişkenleri ile yapılandırılır.

export async function revalidateSite(slug?: string): Promise<void> {
  const url = process.env.SITE_REVALIDATE_URL;
  const secret = process.env.SITE_REVALIDATE_SECRET;

  if (!url || !secret) return; // env yoksa sessizce geç (dev ortamı)

  try {
    await fetch(`${url}?secret=${encodeURIComponent(secret)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(5000), // 5 saniye timeout
    });
  } catch {
    // Site revalidation başarısız olsa bile ERP işlemi durmasın
  }
}
