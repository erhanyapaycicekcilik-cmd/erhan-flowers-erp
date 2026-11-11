export type EInvoiceSettings = {
  provider: 'TRENDYOL_EFATURAM';
  active: boolean;
  /** STAGE: test ortamı (fatura GİB'e gitmez) / PROD: canlı */
  environment: 'STAGE' | 'PROD';
  /** Trendyol e-Faturam portal e-posta adresi (API kullanıcı adı) */
  email: string;
  /** Şifre (test ortamında e-postadaki linkle belirlenen; GET'te maskelenir) */
  password: string;
  /** Firma ID (companyId). Boşsa token içinden okunur */
  firmId: string;
  /** Kullanıcı ID (userId). Boşsa token içinden okunur */
  userId: string;
  eArchiveSeries: string;
  eInvoiceSeries: string;
  autoIssue: boolean;
  /** DELIVERED: teslim edilince / SHIPPED: kargoya verilince */
  issueOn: 'DELIVERED' | 'SHIPPED';
  /** Fiyatlar KDV dahil kabul edilir */
  vatRate: number;
  /** İnternet satışı e-Arşiv için zorunlu: satış yapılan web sitesi */
  webSiteUrl: string;
  /** İnternet satışı e-Arşiv için zorunlu: taşıyıcı (kargo firması) bilgisi */
  carrierName: string;
  carrierTaxId: string;
  /** Alıcı adresinde şehir yoksa kullanılacak şehir (dükkanın bulunduğu il) */
  defaultCity: string;
  /** Alıcı adresi yoksa kullanılacak ilçe ve açık adres (dükkan adresi) */
  defaultDistrict: string;
  defaultAddress: string;
};

export type EInvoiceDraftLine = {
  name: string;
  quantity: number;
  unitPriceInclVat: number;
  vatRate: number;
  totalInclVat: number;
};

export type EInvoiceDraft = {
  sourceType: 'RETAIL_SALE' | 'WEB_ORDER';
  sourceId: number;
  sourceNumber: string;
  invoiceType: 'E_ARSIV' | 'E_FATURA';
  series: string;
  issueDate: Date;
  orderDate: Date;
  currency: string;
  buyer: {
    name: string;
    vknTckn: string | null;
    taxOffice: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
    postalCode: string | null;
  };
  /** Dolu ise internet satışı (web sitesi) faturasıdır: ödeme + gönderi bilgisi zorunlu */
  internetSale: {
    paymentMeans: 'CREDIT_CARD' | 'EFT' | 'ON_DELIVERY' | 'MEDIATOR' | 'OTHER';
    paymentDate: Date | null;
    shippedAt: Date;
  } | null;
  lines: EInvoiceDraftLine[];
  totalInclVat: number;
};

export type EInvoiceIssueResult = {
  invoiceNumber: string;
  providerRef?: string | null;
  pdfUrl?: string | null;
};

export interface EInvoiceProvider {
  /** Sağlayıcıya gerçekten fatura gönderebiliyor muyuz? */
  readonly ready: boolean;
  readonly notReadyReason?: string;
  testConnection(settings: EInvoiceSettings): Promise<{ ok: boolean; message: string }>;
  /** documentUuid: tekrar denemelerde aynı faturanın iki kez kesilmemesi için sabit ETTN */
  issue(settings: EInvoiceSettings, draft: EInvoiceDraft, documentUuid: string): Promise<EInvoiceIssueResult>;
  pdfUrl(settings: EInvoiceSettings, documentUuid: string, invoiceType: 'E_ARSIV' | 'E_FATURA'): Promise<string>;
}
