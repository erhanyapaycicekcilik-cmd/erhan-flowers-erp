import { Injectable } from '@nestjs/common';

type PreviewOperation = 'PREVIEW_PRODUCT' | 'PREVIEW_PRICE' | 'PREVIEW_STOCK';

@Injectable()
export class MockMarketplaceAdapter {
  testConnection() {
    return {
      success: true,
      mode: 'DRY_RUN',
      channel: 'MOCK',
      operation: 'TEST_CONNECTION',
      changes: [],
      warnings: [],
      errors: [],
    };
  }

  previewProduct(payload: Record<string, unknown>) {
    return this.preview('PREVIEW_PRODUCT', payload);
  }

  previewPrice(payload: Record<string, unknown>) {
    return this.preview('PREVIEW_PRICE', payload);
  }

  previewStock(payload: Record<string, unknown>) {
    return this.preview('PREVIEW_STOCK', payload);
  }

  private preview(operation: PreviewOperation, payload: Record<string, unknown>) {
    const warnings: string[] = [];
    if (!payload.barcode) warnings.push('Barkod eksik.');
    if (!payload.sku) warnings.push('SKU eksik.');

    return {
      success: true,
      mode: 'DRY_RUN',
      channel: 'MOCK',
      operation,
      changes: [
        { field: 'productName', plannedValue: payload.productName ?? null },
        { field: 'barcode', plannedValue: payload.barcode ?? null },
        { field: 'sku', plannedValue: payload.sku ?? null },
        { field: 'stockQuantity', plannedValue: payload.stockQuantity ?? null },
        { field: 'salePrice', plannedValue: payload.salePrice ?? null },
      ],
      warnings,
      errors: [],
    };
  }
}
