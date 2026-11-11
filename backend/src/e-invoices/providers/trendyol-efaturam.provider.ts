import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { EInvoiceDraft, EInvoiceIssueResult, EInvoiceProvider, EInvoiceSettings } from './e-invoice-provider.interface';

/**
 * Trendyol e-Faturam "Bireysel Entegrasyon" API istemcisi.
 * Doküman: https://developers.trendyolefaturam.com/docs
 *
 * - Giriş: POST /api/auth/signin {email,password} → x-access-token (JWT) header'ı
 * - e-Arşiv: POST /api/invoice/documents/earchive (tutarlar KURUŞ)
 * - Mükellef sorgu: GET /api/invoice/taxpayers/:taxId
 * - PDF: POST /api/invoice/documents/download/permanent-url
 * - İstekler yalnızca portalda tanımlı IPv4 adreslerinden kabul edilir (aksi halde Cloudflare 403)
 */
const BASE_URLS: Record<EInvoiceSettings['environment'], string> = {
  STAGE: 'https://stage-apigateway.trendyolefaturam.com',
  PROD: 'https://apigateway.trendyolecozum.com',
};

/** Bilinmeyen bireysel alıcı için GİB'in kabul ettiği TCKN */
const ANONYMOUS_TCKN = '11111111111';
const ERROR_STATUSES = new Set([29, 405]);

type HttpResult = { status: number; headers: http.IncomingHttpHeaders; body: string };
type Session = { key: string; token: string; companyId: number; userId: number; expiresAt: number };

export class EFaturamError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

@Injectable()
export class TrendyolEFaturamProvider implements EInvoiceProvider {
  private readonly logger = new Logger(TrendyolEFaturamProvider.name);
  readonly ready = true;
  readonly notReadyReason = undefined;
  private session: Session | null = null;

  // ─── HTTP ───────────────────────────────────────────────────────────────

  private baseUrl(s: EInvoiceSettings) {
    return process.env.EFATURAM_BASE_URL || BASE_URLS[s.environment] || BASE_URLS.STAGE;
  }

  private request(url: string, method: string, headers: Record<string, string>, body?: unknown): Promise<HttpResult> {
    const u = new URL(url);
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const lib = u.protocol === 'http:' ? http : https;
    return new Promise((resolve, reject) => {
      const req = lib.request(
        {
          method,
          hostname: u.hostname,
          port: u.port || undefined,
          path: u.pathname + u.search,
          // e-Faturam whitelist'i sadece IPv4 kabul ediyor
          family: 4,
          timeout: 30000,
          headers: {
            Accept: 'application/json, text/plain, */*',
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
            ...headers,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c as Buffer));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
        },
      );
      req.on('timeout', () => req.destroy(new Error('e-Faturam isteği zaman aşımına uğradı (30 sn).')));
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  private errorText(res: HttpResult): string {
    if (res.status === 403 && /cloudflare|<html/i.test(res.body)) {
      return 'Erişim reddedildi (403). Sunucu IP adresi (77.42.122.169) Trendyol e-Faturam portalında entegrasyon IP listesine eklenmemiş olabilir.';
    }
    try {
      const j = JSON.parse(res.body);
      const parts = [j.detail, j.title, j.message, j.error].filter((x) => typeof x === 'string' && x);
      const violations = Array.isArray(j.violations)
        ? j.violations.map((v: { field?: string; message?: string }) => [v.field, v.message].filter(Boolean).join(': '))
        : Array.isArray(j.errors)
          ? j.errors.map((e: unknown) => (typeof e === 'string' ? e : JSON.stringify(e)))
          : [];
      const text = [...new Set([...parts, ...violations])].join(' — ');
      if (text) return `${text} (HTTP ${res.status})`;
    } catch {
      /* JSON değil */
    }
    return `e-Faturam HTTP ${res.status}: ${res.body.slice(0, 300) || 'boş cevap'}`;
  }

  // ─── Oturum ─────────────────────────────────────────────────────────────

  private decodeJwt(token: string): Record<string, unknown> {
    try {
      return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    } catch {
      return {};
    }
  }

  /** JWT içindeki alanları düzleştirir: {a:{b:1}} → {"a.b": 1}; JSON-string alanları da açar */
  private flatten(obj: unknown, prefix = '', out: Record<string, unknown> = {}, depth = 0): Record<string, unknown> {
    if (depth > 4 || obj === null || obj === undefined) return out;
    if (typeof obj === 'string' && /^[\[{]/.test(obj.trim())) {
      try {
        return this.flatten(JSON.parse(obj), prefix, out, depth + 1);
      } catch {
        /* düz metin */
      }
    }
    if (Array.isArray(obj)) {
      obj.slice(0, 5).forEach((v, i) => this.flatten(v, `${prefix}[${i}]`, out, depth + 1));
      if (prefix) out[prefix] = obj;
      return out;
    }
    if (typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) this.flatten(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
      return out;
    }
    out[prefix] = obj;
    return out;
  }

  private findNumericClaim(flat: Record<string, unknown>, patterns: RegExp[]): number | null {
    const entries = Object.entries(flat);
    for (const p of patterns) {
      for (const [k, v] of entries) {
        const leaf = k.split('.').pop() ?? k;
        if (!p.test(leaf) && !p.test(k)) continue;
        const n = Array.isArray(v) ? Number(v[0]) : Number(v);
        if (v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(n) && n > 0) return n;
      }
    }
    return null;
  }

  /** Teşhis için: token alan adları ve sayısal değerleri (kimlik numaraları; gizli bilgi içermez) */
  private describeClaims(flat: Record<string, unknown>): string {
    const skip = /^(exp|iat|nbf|jti|iss|aud)$/i;
    return Object.entries(flat)
      .filter(([k]) => !skip.test(k))
      .map(([k, v]) => (typeof v === 'number' || /^\d+$/.test(String(v)) ? `${k}=${v}` : k))
      .slice(0, 25)
      .join(', ');
  }

  private async login(s: EInvoiceSettings, force = false): Promise<Session> {
    if (!s.email || !s.password) throw new EFaturamError('e-Faturam e-posta ve şifresi girilmemiş.');
    const key = `${s.environment}|${s.email}|${s.password}`;
    if (!force && this.session && this.session.key === key && this.session.expiresAt > Date.now() + 60_000) return this.session;

    const res = await this.request(`${this.baseUrl(s)}/api/auth/signin`, 'POST', {}, { email: s.email, password: s.password });
    if (res.status < 200 || res.status >= 300) {
      if (res.status === 401) throw new EFaturamError('e-Faturam girişi başarısız: e-posta veya şifre hatalı (test ve canlı ortam şifreleri farklıdır).', 401);
      throw new EFaturamError(`e-Faturam girişi başarısız: ${this.errorText(res)}`, res.status);
    }
    const raw = res.headers['x-access-token'];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token) throw new EFaturamError('e-Faturam girişi başarılı ama x-access-token dönmedi.');

    const claims = this.decodeJwt(token);
    const flat = this.flatten(claims);
    const bodyNum = Number(res.body.trim());
    // e-Faturam token'ı: { sub: <userId>, eml, privs: { "<companyId>": [yetkiler] }, rls }
    const privs = claims.privs && typeof claims.privs === 'object' && !Array.isArray(claims.privs) ? Object.keys(claims.privs) : [];
    const privCompanyId = Number(privs.find((k) => /^\d{6,}$/.test(k))) || null;
    const companyId =
      Number(s.firmId) ||
      privCompanyId ||
      this.findNumericClaim(flat, [/^companyId$/i, /compan(y|ies).?ids?$/i, /^company$/i, /^cid$/i, /compan[^.]*\.id$/i, /firm.?id/i, /tenant.?id/i, /customer.?id/i]);
    const userId =
      Number(s.userId) ||
      this.findNumericClaim(flat, [/^userId$/i, /user.?id/i, /^uid$/i, /^id$/i, /^sub$/i]) ||
      (Number.isFinite(bodyNum) && bodyNum > 0 ? bodyNum : null);
    if (!companyId) {
      this.logger.warn(`e-Faturam token alanları: ${this.describeClaims(flat)} | giriş cevabı: ${res.body.slice(0, 100)}`);
      throw new EFaturamError(
        `Giriş başarılı ama Firma ID token içinde bulunamadı. Ayarlarda "Firma ID" alanını doldurun. ` +
          `(Token alanları: ${this.describeClaims(flat) || 'yok'}; giriş cevabı: ${res.body.slice(0, 40) || 'boş'})`,
      );
    }
    if (!userId) throw new EFaturamError('Kullanıcı ID token içinde bulunamadı. Ayarlarda "Kullanıcı ID" alanını doldurun.');
    const exp = Number(claims.exp);
    this.session = { key, token, companyId, userId, expiresAt: Number.isFinite(exp) && exp > 0 ? exp * 1000 : Date.now() + 30 * 60_000 };
    return this.session;
  }

  /** Token ile istek; 401 alırsa bir kez yeniden giriş yapıp tekrar dener */
  private async call(s: EInvoiceSettings, method: string, path: string, body?: unknown): Promise<HttpResult> {
    let session = await this.login(s);
    const send = (t: string) =>
      this.request(`${this.baseUrl(s)}${path}`, method, { 'x-access-token': t, Authorization: `Bearer ${t}` }, body);
    let res = await send(session.token);
    if (res.status === 401) {
      session = await this.login(s, true);
      res = await send(session.token);
    }
    return res;
  }

  // ─── Public ─────────────────────────────────────────────────────────────

  async testConnection(s: EInvoiceSettings): Promise<{ ok: boolean; message: string }> {
    try {
      const session = await this.login(s, true);
      const env = s.environment === 'PROD' ? 'CANLI' : 'TEST';
      return { ok: true, message: `Bağlantı başarılı (${env} ortamı). Firma ID: ${session.companyId}, Kullanıcı ID: ${session.userId}.` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }

  /** Alıcı e-Fatura mükellefi mi? (VKN/TCKN ile GİB listesinde etiketi varsa evet) */
  async isEInvoiceTaxpayer(s: EInvoiceSettings, taxId: string): Promise<boolean> {
    const res = await this.call(s, 'GET', `/api/invoice/taxpayers/${encodeURIComponent(taxId)}`);
    if (res.status === 404) return false;
    if (res.status < 200 || res.status >= 300) throw new EFaturamError(`Mükellef sorgusu başarısız: ${this.errorText(res)}`, res.status);
    try {
      const list = JSON.parse(res.body) as Array<{ aliasType?: string; deletedAt?: string | null }>;
      return Array.isArray(list) && list.some((x) => (x.aliasType ?? 'INVOICE') === 'INVOICE' && !x.deletedAt);
    } catch {
      return false;
    }
  }

  async issue(s: EInvoiceSettings, draft: EInvoiceDraft, documentUuid: string): Promise<EInvoiceIssueResult> {
    const buyerTaxId = (draft.buyer.vknTckn ?? '').replace(/\D/g, '');
    const isEInvoiceBuyer =
      draft.invoiceType === 'E_FATURA' || (buyerTaxId.length >= 10 && buyerTaxId !== ANONYMOUS_TCKN && (await this.isEInvoiceTaxpayer(s, buyerTaxId)));
    if (isEInvoiceBuyer) {
      throw new EFaturamError('Alıcı e-Fatura mükellefi: bu satışa e-Arşiv kesilemez. e-Fatura gönderimi henüz ERP\'ye eklenmedi; şimdilik Trendyol e-Faturam portalından kesin.');
    }

    const session = await this.login(s);
    const body = this.buildEArchiveRequest(s, draft, documentUuid, session);
    const res = await this.call(s, 'POST', '/api/invoice/documents/earchive', body);

    if (res.status === 409) {
      // Aynı ETTN ile daha önce oluşmuş (ör. önceki deneme zaman aşımına uğradı) → durumu sorgula
      const st = await this.call(s, 'GET', `/api/invoice/documents/earchive/status/${documentUuid}`);
      if (st.status >= 200 && st.status < 300) {
        const j = JSON.parse(st.body) as { status?: number };
        if (j.status !== undefined && ERROR_STATUSES.has(Number(j.status))) {
          throw new EFaturamError(`Fatura e-Faturam'da hatalı durumda (statü ${j.status}).`);
        }
        return { invoiceNumber: `ETTN ${documentUuid}`, providerRef: documentUuid };
      }
      throw new EFaturamError(this.errorText(res), res.status);
    }
    if (res.status < 200 || res.status >= 300) throw new EFaturamError(this.errorText(res), res.status);

    const j = JSON.parse(res.body) as { invoiceId?: string; invoiceUuid?: string; status?: number };
    if (j.status !== undefined && ERROR_STATUSES.has(Number(j.status))) {
      throw new EFaturamError(`Fatura oluşturuldu ama hatalı statüde döndü (statü ${j.status}).`);
    }
    return { invoiceNumber: j.invoiceId || `ETTN ${j.invoiceUuid ?? documentUuid}`, providerRef: j.invoiceUuid ?? documentUuid };
  }

  async pdfUrl(s: EInvoiceSettings, documentUuid: string, invoiceType: 'E_ARSIV' | 'E_FATURA'): Promise<string> {
    const session = await this.login(s);
    const res = await this.call(s, 'POST', '/api/invoice/documents/download/permanent-url', {
      documentType: invoiceType === 'E_FATURA' ? 'EINVOICE' : 'EARCHIVE',
      fileExtension: 'pdf',
      documentUuid,
      companyId: session.companyId,
    });
    if (res.status < 200 || res.status >= 300) throw new EFaturamError(`PDF linki alınamadı: ${this.errorText(res)}`, res.status);
    const text = res.body.trim().replace(/^"|"$/g, '');
    if (!/^https?:\/\//i.test(text)) throw new EFaturamError('PDF linki alınamadı: beklenmeyen cevap.');
    return text;
  }

  // ─── e-Arşiv istek gövdesi ──────────────────────────────────────────────

  buildEArchiveRequest(s: EInvoiceSettings, d: EInvoiceDraft, documentUuid: string, session: { companyId: number; userId: number }) {
    const kurus = (tl: number) => Math.round(tl * 100);
    const ymd = (date: Date) => date.toISOString().slice(0, 10);

    const lines = d.lines
      .filter((l) => l.totalInclVat > 0 && l.quantity > 0)
      .map((l) => {
        const gross = kurus(l.totalInclVat);
        const taxable = Math.round(gross / (1 + l.vatRate / 100));
        const tax = gross - taxable;
        return {
          unitCode: 'C62',
          quantity: l.quantity,
          totalAmount: taxable,
          taxAmount: tax,
          taxableAmount: taxable,
          taxPercent: l.vatRate,
          taxName: 'KDV',
          taxCode: '0015',
          itemName: l.name.slice(0, 255),
          unitPriceAmount: Math.round((taxable / l.quantity) * 10000) / 10000,
          totalDiscountAmount: 0,
          totalTax: {
            totalTaxAmount: tax,
            subTotalTaxes: [{ taxableAmount: taxable, taxAmount: tax, taxType: 'KDV', percent: l.vatRate, name: 'KDV' }],
          },
        };
      });
    if (!lines.length) throw new EFaturamError('Faturada tutarı 0\'dan büyük kalem yok.');

    // KDV oranlarına göre kırılım
    const byRate = new Map<number, { taxableAmount: number; taxAmount: number }>();
    for (const l of lines) {
      const r = byRate.get(l.taxPercent) ?? { taxableAmount: 0, taxAmount: 0 };
      r.taxableAmount += l.taxableAmount;
      r.taxAmount += l.taxAmount;
      byRate.set(l.taxPercent, r);
    }
    const taxExclusive = lines.reduce((a, l) => a + l.taxableAmount, 0);
    const taxTotal = lines.reduce((a, l) => a + l.taxAmount, 0);

    // Alıcı
    const b = d.buyer;
    const fullName = (b.name || 'Nihai Tüketici').trim();
    const taxId = (b.vknTckn ?? '').replace(/\D/g, '');
    const validTaxId = taxId.length === 10 || taxId.length === 11 ? taxId : ANONYMOUS_TCKN;
    const isCompany = validTaxId.length === 10;
    let name = fullName;
    let surname: string | undefined;
    if (!isCompany) {
      const parts = fullName.split(/\s+/);
      if (parts.length > 1) {
        surname = parts.pop();
        name = parts.join(' ');
      }
    }
    const phone = (b.phone ?? '').replace(/[^\d+]/g, '');
    const email = (b.email ?? '').trim().toLowerCase();
    const postal = (b.postalCode ?? '').replace(/\D/g, '');
    // Alıcının adresi yoksa (ör. hızlı dükkan satışı) dükkan adresi kullanılır; e-Faturam il + ilçe istiyor
    const buyerHasCity = !!(b.city && b.city.trim().length >= 2);
    const city = buyerHasCity ? b.city!.trim() : (s.defaultCity ?? '').trim();
    const district = b.district?.trim() || (buyerHasCity ? 'Merkez' : (s.defaultDistrict ?? '').trim());
    const address =
      b.address && b.address.trim().length >= 2
        ? b.address.trim()
        : !buyerHasCity && (s.defaultAddress ?? '').trim().length >= 2
          ? s.defaultAddress.trim()
          : `${district} / ${city}`;
    const recipientInfo: Record<string, unknown> = {
      taxId: validTaxId,
      countryCode: 'TR',
      city,
      name: name.length >= 2 ? name.slice(0, 127) : 'Nihai Tüketici',
    };
    if (city.length < 2 || !district) {
      throw new EFaturamError('Alıcının adresi yok. Ayarlarda "Varsayılan Şehir" ve "Varsayılan İlçe" (dükkan adresi) alanlarını doldurun.');
    }
    recipientInfo.district = district;
    recipientInfo.address = address.slice(0, 255);
    if (surname && surname.length >= 2) recipientInfo.surname = surname.slice(0, 255);
    if (postal.length === 5) recipientInfo.postalCode = postal;
    if (/^\+?[0-9]{7,15}$/.test(phone)) recipientInfo.phone = phone;
    if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) recipientInfo.email = email;
    if (isCompany && b.taxOffice && b.taxOffice.trim().length >= 2) recipientInfo.taxOffice = b.taxOffice.trim();

    const body: Record<string, unknown> = {
      autoInvoiceId: true,
      companyId: session.companyId,
      userId: session.userId,
      source: 'WEB',
      localReferenceId: `${d.sourceType}-${d.sourceId}`.slice(0, 127),
      notes: [`Sipariş/Satış No: ${d.sourceNumber}`],
      recipientInfo,
      currencyInfo: { currency: d.currency || 'TRY' },
      invoiceInfo: { invoiceType: 'EARSIVFATURA', invoiceTypeCode: 'SATIS', invoiceUuid: documentUuid },
      invoiceLines: lines,
      totalTax: {
        totalTaxAmount: taxTotal,
        subTotalTaxes: [...byRate.entries()].map(([percent, v]) => ({ ...v, taxType: 'KDV', percent, name: 'KDV' })),
      },
      invoiceTotal: {
        lineExtensionAmount: taxExclusive,
        taxExclusiveAmount: taxExclusive,
        taxInclusiveAmount: taxExclusive + taxTotal,
        payableAmount: taxExclusive + taxTotal,
        allowanceTotalAmount: 0,
      },
      orderInfo: { orderId: d.sourceNumber, orderDate: ymd(d.orderDate) },
      issuedAt: d.issueDate.toISOString(),
    };
    if (/^[A-Z0-9]{3}$/.test(d.series)) body.prefix = d.series;

    if (d.internetSale) {
      if (!s.webSiteUrl || !s.carrierName || !/^\d{10,11}$/.test(s.carrierTaxId)) {
        throw new EFaturamError('İnternet satışı faturası için ayarlarda web sitesi adresi ile kargo firması adı ve VKN\'si girilmeli.');
      }
      body.paymentInfo = {
        purchaseUrl: s.webSiteUrl,
        paymentMeans: d.internetSale.paymentMeans,
        ...(d.internetSale.paymentDate ? { paymentDate: d.internetSale.paymentDate.toISOString() } : {}),
      };
      body.deliveryInfo = { carrierTaxId: s.carrierTaxId, carrierName: s.carrierName, sentAt: ymd(d.internetSale.shippedAt) };
    }
    return body;
  }
}
