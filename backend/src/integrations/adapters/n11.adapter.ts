import { Injectable, Optional } from '@nestjs/common';
import { HttpMarketplaceOrderAdapter } from './http-marketplace-order.adapter';

@Injectable()
export class N11Adapter extends HttpMarketplaceOrderAdapter {
  constructor(@Optional() runtimeCredentials?: Record<string, string>) {
    super({
      platform: 'N11',
      envPrefix: 'N11',
      defaultApiUrl: 'https://api.n11.com',
      defaultOrderPath: '/rest/delivery/v1/shipmentPackages',
      defaultProductPath: '/ms/product/tasks/product-create',
      runtimeCredentials,
    });
  }
}
