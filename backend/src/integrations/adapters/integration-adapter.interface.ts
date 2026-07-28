export type IntegrationPlatform = 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'AMAZON' | 'WEBSITE' | 'TICIMAX';

export type AdapterConnectionResult = {
  ok: boolean;
  status: 'CONNECTED' | 'MISSING_CREDENTIALS' | 'FAILED' | 'NOT_IMPLEMENTED';
  message: string;
  missingKeys?: string[];
};

export type ExternalOrderItem = {
  externalLineId?: string;
  externalVariantId?: string;
  productName: string;
  variationText?: string;
  barcode?: string;
  modelCode?: string;
  quantity: number;
  unitPrice: number;
};

export type ExternalOrder = {
  externalOrderId: string;
  platformOrderNumber: string;
  platform: IntegrationPlatform;
  customerName: string;
  phone: string;
  addressText?: string;
  city?: string;
  district?: string;
  totalAmount: number;
  paidAmount?: number;
  paymentStatus?: 'PAID' | 'WAITING';
  cargoProvider?: string;
  cargoTrackingNumber?: string;
  orderDate?: Date;
  deliveryDueAt?: Date;
  items: ExternalOrderItem[];
};

export interface IntegrationAdapter {
  platform: IntegrationPlatform;
  testConnection(): Promise<AdapterConnectionResult>;
  fetchOrders(): Promise<ExternalOrder[]>;
  fetchOrderDetail(externalOrderId: string): Promise<ExternalOrder | null>;
  pushStock(payload: unknown): Promise<AdapterConnectionResult>;
  pushPrice(payload: unknown): Promise<AdapterConnectionResult>;
  pushProduct(payload: unknown): Promise<AdapterConnectionResult>;
  updateOrderStatus(payload: unknown): Promise<AdapterConnectionResult>;
}
