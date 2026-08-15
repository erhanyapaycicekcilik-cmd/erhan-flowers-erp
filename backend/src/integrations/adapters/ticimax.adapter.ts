import { Injectable, Optional } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, ExternalOrder, IntegrationPlatform } from './integration-adapter.interface';

@Injectable()
export class TicimaxAdapter extends BaseIntegrationAdapter {
  platform: IntegrationPlatform = 'TICIMAX';

  constructor(@Optional() private readonly runtimeCredentials: Record<string, string> = {}) {
    super();
  }

  async testConnection(): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    const response = await fetch(this.wsdlUrl(), { method: 'GET' });
    if (response.ok) return { ok: true, status: 'CONNECTED', message: 'Ticimax UrunServis WSDL erisimi dogrulandi.' };
    return { ok: false, status: 'FAILED', message: `Ticimax WSDL testi basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}` };
  }

  async pushProduct(payload: unknown): Promise<AdapterConnectionResult> {
    const missing = this.missingKeys();
    if (missing.length) return this.missing(missing);
    const response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'SaveUrun' },
      body: this.soapEnvelope(payload),
    });
    if (response.ok) return { ok: true, status: 'CONNECTED', message: 'Ticimax urun gonderimi tamamlandi.' };
    return { ok: false, status: response.status === 401 || response.status === 403 ? 'MISSING_CREDENTIALS' : 'FAILED', message: `Ticimax urun gonderimi basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}` };
  }

  async fetchOrders(): Promise<ExternalOrder[]> {
    const missing = this.orderMissingKeys();
    if (missing.length) {
      throw new Error(`TICIMAX siparis servisi eksik: ${missing.join(', ')}`);
    }
    const response = await fetch(this.orderEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'SelectSiparis' },
      body: this.orderSoapEnvelope(),
    });
    if (!response.ok) {
      throw new Error(`Ticimax siparis cekme basarisiz. HTTP ${response.status}: ${await this.safeErrorText(response)}`);
    }
    const text = await response.text();
    return this.parseOrders(text);
  }

  private soapEnvelope(payload: unknown) {
    const data = this.record(payload);
    const images = Array.isArray(data.images) ? data.images : [];
    return [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      '<soap:Body>',
      '<SaveUrun xmlns="http://tempuri.org/">',
      `<UyeKodu>${this.escape(this.uyeKodu())}</UyeKodu>`,
      '<urunler>',
      '<UrunKarti>',
      `<UrunAdi>${this.escape(data.productName)}</UrunAdi>`,
      `<UrunKodu>${this.escape(data.modelCode)}</UrunKodu>`,
      `<Barkod>${this.escape(data.barcode)}</Barkod>`,
      `<Aciklama>${this.escape(data.description)}</Aciklama>`,
      `<Marka>${this.escape(data.brand)}</Marka>`,
      `<Resimler>${images.map((image) => `<string>${this.escape(image)}</string>`).join('')}</Resimler>`,
      '<Varyasyonlar>',
      '<Varyasyon>',
      `<StokKodu>${this.escape(data.modelCode)}</StokKodu>`,
      `<Barkod>${this.escape(data.barcode)}</Barkod>`,
      `<StokAdedi>${Number(data.stockQuantity ?? 0)}</StokAdedi>`,
      `<SatisFiyati>${Number(data.salePrice ?? 0)}</SatisFiyati>`,
      '</Varyasyon>',
      '</Varyasyonlar>',
      '</UrunKarti>',
      '</urunler>',
      '</SaveUrun>',
      '</soap:Body>',
      '</soap:Envelope>',
    ].join('');
  }

  private missingKeys() {
    return [
      !this.env('SERVICE_ENDPOINT') ? 'TICIMAX_SERVICE_ENDPOINT' : '',
      !this.env('WSDL_URL') ? 'TICIMAX_WSDL_URL' : '',
      !this.env('UYE_KODU') ? 'TICIMAX_UYE_KODU' : '',
    ].filter(Boolean);
  }

  private orderMissingKeys() {
    return [
      !this.orderEndpoint() ? 'TICIMAX_ORDER_SERVICE_ENDPOINT' : '',
      !this.env('UYE_KODU') ? 'TICIMAX_UYE_KODU' : '',
    ].filter(Boolean);
  }

  private endpoint() {
    return this.env('SERVICE_ENDPOINT');
  }

  private wsdlUrl() {
    return this.env('WSDL_URL');
  }

  private uyeKodu() {
    return this.env('UYE_KODU');
  }

  private orderEndpoint() {
    const configured = this.env('ORDER_SERVICE_ENDPOINT');
    if (configured) return configured;
    return this.endpoint().replace(/UrunServis\.svc/i, 'SiparisServis.svc');
  }

  private orderSoapEnvelope() {
    const start = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date().toISOString();
    return [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      '<soap:Body>',
      '<SelectSiparis xmlns="http://tempuri.org/">',
      `<UyeKodu>${this.escape(this.uyeKodu())}</UyeKodu>`,
      '<f>',
      `<BaslangicTarihi>${start}</BaslangicTarihi>`,
      `<BitisTarihi>${end}</BitisTarihi>`,
      '</f>',
      '</SelectSiparis>',
      '</soap:Body>',
      '</soap:Envelope>',
    ].join('');
  }

  private parseOrders(xml: string): ExternalOrder[] {
    const blocks = Array.from(xml.matchAll(/<[^>]*(?:Siparis|Order)[^>]*>([\s\S]*?)<\/[^>]*(?:Siparis|Order)[^>]*>/gi)).map((match) => match[1]);
    return blocks
      .map((block, index) => {
        const orderNo = this.xmlValue(block, 'SiparisNo') || this.xmlValue(block, 'OrderNumber') || this.xmlValue(block, 'Id') || this.xmlValue(block, 'ID') || String(index + 1);
        const customerName = [this.xmlValue(block, 'Adi'), this.xmlValue(block, 'Soyadi')].filter(Boolean).join(' ') || this.xmlValue(block, 'AdSoyad') || this.xmlValue(block, 'CustomerName') || 'Ticimax Musteri';
        return {
          externalOrderId: orderNo,
          platformOrderNumber: orderNo,
          platform: 'TICIMAX' as IntegrationPlatform,
          status: 'CONFIRMED' as const,
          customerName,
          phone: this.xmlValue(block, 'Telefon') || this.xmlValue(block, 'Phone') || '',
          addressText: this.xmlValue(block, 'Adres') || this.xmlValue(block, 'Address') || '',
          city: this.xmlValue(block, 'Il') || this.xmlValue(block, 'City') || undefined,
          district: this.xmlValue(block, 'Ilce') || this.xmlValue(block, 'District') || undefined,
          totalAmount: Number(this.xmlValue(block, 'GenelToplam') || this.xmlValue(block, 'Total') || 0),
          paidAmount: Number(this.xmlValue(block, 'GenelToplam') || this.xmlValue(block, 'Total') || 0),
          paymentStatus: 'PAID' as const,
          orderDate: this.date(this.xmlValue(block, 'SiparisTarihi') || this.xmlValue(block, 'OrderDate')),
          items: [{
            productName: this.xmlValue(block, 'UrunAdi') || this.xmlValue(block, 'ProductName') || 'Ticimax urunu',
            barcode: this.xmlValue(block, 'Barkod') || undefined,
            modelCode: this.xmlValue(block, 'StokKodu') || undefined,
            quantity: Number(this.xmlValue(block, 'Adet') || this.xmlValue(block, 'Quantity') || 1),
            unitPrice: Number(this.xmlValue(block, 'Tutar') || this.xmlValue(block, 'Price') || 0),
          }],
        };
      })
      .filter((order) => order.externalOrderId);
  }

  private xmlValue(block: string, tag: string) {
    const match = block.match(new RegExp(`<[^>]*${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*${tag}[^>]*>`, 'i'));
    return match ? this.unescape(match[1]).trim() : '';
  }

  private unescape(value: string) {
    return value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  private date(value: unknown) {
    const parsed = new Date(String(value ?? ''));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private env(key: string) {
    return String(this.runtimeCredentials[key] ?? process.env[`TICIMAX_${key}`] ?? '').trim();
  }

  private async safeErrorText(response: Response) {
    const text = await response.text().catch(() => '');
    return text.slice(0, 300) || response.statusText || 'Yanit okunamadi';
  }

  private record(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  }

  private escape(value: unknown) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
