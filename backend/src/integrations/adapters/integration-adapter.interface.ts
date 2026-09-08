export type IntegrationPlatform = 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'AMAZON' | 'WEBSITE' | 'TICIMAX';

export type AdapterConnectionResult = {
  ok: boolean;
  status: 'CONNECTED' | 'MISSING_CREDENTIALS' | 'FAILED' | 'NOT_IMPLEMENTED';
  message: string;
  missingKeys?: string[];
  batchRequestId?: string;
  listingUploadId?: string;
};

export type ExternalOrderItem = {
  externalLineId?: string;
  externalVariantId?: string;
  productName: string;
  variationText?: string;
  sku?: string;
  barcode?: string;
  modelCode?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
};

export type ExternalOrder = {
  externalOrderId: string;
  platformOrderNumber: string;
  platform: IntegrationPlatform;
  status?: 'DRAFT' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'PREPARING' | 'IN_PRODUCTION' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  invoiceStatus?: 'WAITING' | 'E_ARCHIVE' | 'E_INVOICE' | 'ISSUED' | 'CANCELLED' | 'RETURNED';
  externalStatus?: string;
  unknownStatus?: boolean;
  customerName: string;
  phone: string;
  addressText?: string;
  city?: string;
  district?: string;
  totalAmount: number;
  paidAmount?: number;
  deliveryFee?: number;
  paymentStatus?: 'PAID' | 'WAITING';
  cargoProvider?: string;
  cargoTrackingNumber?: string;
  orderDate?: Date;
  deliveryDueAt?: Date;
  items: ExternalOrderItem[];
};

export type ExternalOrderSummary = {
  total: number;
  new: number;
  processing: number;
  ready: number;
  transit: number;
  delivered: number;
  reshipment: number;
  hold: number;
  cancelled: number;
  returned: number;
  lastUpdatedAt: string;
  source: 'LIVE' | 'LOCAL';
};

export interface IntegrationAdapter {
  platform: IntegrationPlatform;
  testConnection(): Promise<AdapterConnectionResult>;
  fetchOrders(): Promise<ExternalOrder[]>;
  fetchOrderSummary?(): Promise<ExternalOrderSummary>;
  fetchOrderDetail(externalOrderId: string): Promise<ExternalOrder | null>;
  pushStock(payload: unknown): Promise<AdapterConnectionResult>;
  pushPrice(payload: unknown): Promise<AdapterConnectionResult>;
  pushProduct(payload: unknown): Promise<AdapterConnectionResult>;
  updateOrderStatus(payload: unknown): Promise<AdapterConnectionResult>;
  checkBatchStatus?(batchRequestId: string): Promise<AdapterConnectionResult & { batchStatus?: string; failedItemCount?: number }>;
  getSellerPanelUrl?(barcode: string): Promise<AdapterConnectionResult & { panelUrl?: string }>;
}
