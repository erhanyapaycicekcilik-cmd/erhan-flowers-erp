import { Injectable } from '@nestjs/common';
import { EInvoiceDraft, EInvoiceIssueResult, EInvoiceProvider, EInvoiceSettings } from './e-invoice-provider.interface';

/**
 * Trendyol e-Faturam web servis istemcisi.
 *
 * Trendyol e-Faturam'ın web servis dokümanı (adres, gönderim ve PDF metodları) henüz elimizde değil.
 * Doküman gelince `issue` ve `testConnection` burada gerçek çağrılarla doldurulacak ve `ready = true` yapılacak.
 * O zamana kadar ekranlar, faturasız satış listesi ve ayarlar çalışır; fatura gönderimi kapalıdır.
 */
@Injectable()
export class TrendyolEFaturamProvider implements EInvoiceProvider {
  readonly ready = false;
  readonly notReadyReason =
    'Trendyol e-Faturam web servis bağlantısı henüz tamamlanmadı. Web servis dokümanı Trendyol e-Faturam desteğinden alınınca fatura kesimi açılacak.';

  async testConnection(settings: EInvoiceSettings): Promise<{ ok: boolean; message: string }> {
    const missing = [
      !settings.firmCode && 'Firma Kısa Kodu',
      !settings.username && 'Web Servis Kullanıcı Kodu',
      !settings.password && 'Web Servis Şifresi',
    ].filter(Boolean);
    if (missing.length) return { ok: false, message: `Eksik bilgi: ${missing.join(', ')}` };
    return { ok: false, message: `Bilgiler kayıtlı. ${this.notReadyReason}` };
  }

  async issue(_settings: EInvoiceSettings, _draft: EInvoiceDraft): Promise<EInvoiceIssueResult> {
    throw new Error(this.notReadyReason);
  }
}
