import { Injectable } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base-adapter';
import { AdapterConnectionResult, IntegrationPlatform } from './integration-adapter.interface';

@Injectable()
export class GenericMarketplaceAdapter extends BaseIntegrationAdapter {
  constructor(public platform: IntegrationPlatform) {
    super();
  }

  async testConnection(): Promise<AdapterConnectionResult> {
    return this.notImplemented('API');
  }
}
