export type EInvoiceSettings = {
  provider: 'TRENDYOL_EFATURAM';
  active: boolean;
  /** Trendyol e-Faturam'ın gönderdiği maildeki Firma Kısa Kodu */
  firmCode: string;
  /** Web Servis Kullanıcı Kodu */
  username: string;
  /** Web Servis Şifresi (GET'te maskelenir) */
  password: string;
  /** e-Faturam hesabının e-posta adresi (bilgi amaçlı) */
  email: string;
  /** Panelde görünen Firma ID (bilgi amaçlı) */
  firmId: string;
  eArchiveSeries: string;
  eInvoiceSeries: string;
  autoIssue: boolean;
  /** DELIVERED: teslim edilince / SHIPPED: kargoya verilince */
  issueOn: 'DELIVERED' | 'SHIPPED';
  /** Fiyatlar KDV dahil kabul edilir */
  vatRate: number;
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
  };
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
  issue(settings: EInvoiceSettings, draft: EInvoiceDraft): Promise<EInvoiceIssueResult>;
}
