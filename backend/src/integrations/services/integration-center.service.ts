import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../../prisma/prisma.service';
import { HepsiburadaAdapter } from '../adapters/hepsiburada.adapter';
import { AdapterConnectionResult, IntegrationAdapter } from '../adapters/integration-adapter.interface';
import { N11Adapter } from '../adapters/n11.adapter';
import { TicimaxAdapter } from '../adapters/ticimax.adapter';
import { TrendyolAdapter } from '../adapters/trendyol.adapter';
import { MockMarketplaceAdapter } from '../adapters/mock/mock-marketplace.adapter';
import { CredentialVaultService } from './credential-vault.service';

type AccountPayload = {
  companyId?: unknown;
  salesChannelId?: unknown;
  name?: unknown;
  externalAccountId?: unknown;
  isActive?: unknown;
  isTestMode?: unknown;
  status?: unknown;
};

type CredentialPayload = {
  credentialType?: unknown;
  value?: unknown;
};

type PlatformSettingsPayload = {
  platform?: unknown;
  accountName?: unknown;
  externalAccountId?: unknown;
  isTestMode?: unknown;
  credentials?: Record<string, unknown>;
};

type MappingPayload = {
  companyId?: unknown;
  salesChannelId?: unknown;
  channelAccountId?: unknown;
  productId?: unknown;
  trendyolProductVariantId?: unknown;
  stockCardId?: unknown;
  externalProductId?: unknown;
  externalVariantId?: unknown;
  externalSku?: unknown;
  externalBarcode?: unknown;
  publicationStatus?: unknown;
};

type DryRunPayload = {
  channelAccountId?: unknown;
  productId?: unknown;
  trendyolProductVariantId?: unknown;
  stockCardId?: unknown;
  mode?: unknown;
};

const credentialTypes = new Set(['API_KEY', 'API_SECRET', 'SUPPLIER_ID', 'TOKEN', 'UYE_KODU', 'USERNAME', 'PASSWORD', 'OTHER']);
const accountStatuses = new Set(['NOT_CONFIGURED', 'CONFIGURED', 'CONNECTED', 'FAILED', 'DISABLED']);
const publicationStatuses = new Set(['DRAFT', 'READY', 'PUBLISHED', 'ERROR', 'PAUSED']);
const managedPlatforms = ['TRENDYOL', 'HEPSIBURADA', 'N11', 'TICIMAX'] as const;
const managedPlatformNames: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'N11',
  TICIMAX: 'Ticimax',
};
const platformCredentialFields: Record<string, string[]> = {
  TRENDYOL: ['SUPPLIER_ID', 'API_KEY', 'API_SECRET'],
  HEPSIBURADA: ['MERCHANT_ID', 'API_KEY', 'API_SECRET', 'USER_AGENT'],
  N11: ['MERCHANT_ID', 'API_KEY', 'API_SECRET'],
  TICIMAX: ['UYE_KODU', 'API_KEY', 'API_SECRET'],
};

@Injectable()
export class IntegrationCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialVault: CredentialVaultService,
    private readonly mockAdapter: MockMarketplaceAdapter,
    private readonly config: ConfigService,
  ) {}

  async listPlatformSettings() {
    await this.ensureManagedIntegrationSeed();
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT a.id AS "accountId", a.name AS "accountName", a.external_account_id AS "externalAccountId",
        a.status, a.is_test_mode AS "isTestMode", a.last_connection_test_at AS "lastConnectionTestAt",
        a.last_connection_status AS "lastConnectionStatus", sc.code AS platform, sc.name AS "platformName",
        cr.credential_type AS "credentialType", cr.masked_value AS "maskedValue", cr.updated_at AS "credentialUpdatedAt"
      FROM sales_channels sc
      LEFT JOIN channel_accounts a ON a.sales_channel_id = sc.id AND a.is_active = true
      LEFT JOIN channel_credentials cr ON cr.channel_account_id = a.id AND cr.is_active = true
      WHERE sc.code IN ('TRENDYOL', 'HEPSIBURADA', 'N11', 'TICIMAX')
      ORDER BY CASE sc.code WHEN 'TRENDYOL' THEN 1 WHEN 'HEPSIBURADA' THEN 2 WHEN 'N11' THEN 3 WHEN 'TICIMAX' THEN 4 ELSE 99 END,
        cr.credential_type ASC
    `;

    return managedPlatforms.map((platform) => {
      const platformRows = rows.filter((row) => row.platform === platform);
      const first = platformRows[0] ?? {};
      const credentials = Object.fromEntries(
        platformRows
          .filter((row) => row.credentialType)
          .map((row) => [this.displayCredentialField(platform, String(row.credentialType)), { maskedValue: row.maskedValue, updatedAt: row.credentialUpdatedAt }]),
      );
      return {
        platform,
        platformName: first.platformName ?? managedPlatformNames[platform],
        accountId: first.accountId ?? null,
        accountName: first.accountName ?? `${managedPlatformNames[platform]} Magaza`,
        externalAccountId: first.externalAccountId ?? '',
        status: first.status ?? 'NOT_CONFIGURED',
        isTestMode: first.isTestMode ?? true,
        lastConnectionTestAt: first.lastConnectionTestAt ?? null,
        lastConnectionStatus: first.lastConnectionStatus ?? null,
        requiredCredentials: platformCredentialFields[platform],
        credentials,
      };
    });
  }

  async savePlatformSettings(payload: PlatformSettingsPayload) {
    await this.ensureManagedIntegrationSeed();
    const platform = this.managedPlatform(payload.platform);
    const accountName = this.text(payload.accountName) || `${managedPlatformNames[platform]} Magaza`;
    const externalAccountId = this.text(payload.externalAccountId) || null;
    const isTestMode = this.boolean(payload.isTestMode, true);
    const accountId = await this.ensureManagedAccount(platform, accountName, externalAccountId, isTestMode);
    const credentials = payload.credentials ?? {};

    for (const field of platformCredentialFields[platform]) {
      const value = this.text(credentials[field]);
      if (!value) continue;
      const credentialType = this.credentialTypeForField(field);
      await this.addCredential(accountId, { credentialType, value });
    }

    await this.prisma.$executeRaw`
      UPDATE channel_accounts
      SET name = ${accountName}, external_account_id = ${externalAccountId},
        is_test_mode = ${isTestMode}, status = 'CONFIGURED'::"ChannelAccountStatus", updated_at = NOW()
      WHERE id = ${accountId}
    `;
    return this.listPlatformSettings();
  }

  async runtimeCredentials(platformValue: unknown) {
    await this.ensureManagedIntegrationSeed();
    const platform = this.managedPlatform(platformValue);
    const [account] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT a.id, a.external_account_id AS "externalAccountId"
      FROM channel_accounts a
      JOIN sales_channels sc ON sc.id = a.sales_channel_id
      JOIN companies c ON c.id = a.company_id
      WHERE sc.code = ${platform} AND c.code = 'ERHAN' AND a.is_active = true
      ORDER BY a.id ASC
      LIMIT 1
    `;
    if (!account) return {};

    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT credential_type AS "credentialType", encrypted_value AS "encryptedValue"
      FROM channel_credentials
      WHERE channel_account_id = ${Number(account.id)} AND is_active = true
    `;
    const values: Record<string, string> = {};
    for (const row of rows) {
      const key = this.runtimeCredentialField(platform, String(row.credentialType));
      const encryptedValue = this.text(row.encryptedValue);
      if (key && encryptedValue) values[key] = this.credentialVault.decrypt(encryptedValue);
    }
    const externalAccountId = this.text(account.externalAccountId);
    if (externalAccountId && !values.MERCHANT_ID) values.MERCHANT_ID = externalAccountId;
    return values;
  }

  async ticimaxRuntimeCredentials(tenantValue?: unknown) {
    const tenant = this.text(tenantValue) || 'Erhan Flowers';
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT site_url AS "siteUrl", service_endpoint AS "serviceEndpoint", wsdl_url AS "wsdlUrl",
        secret_value AS "secretValue"
      FROM integration_tenant_settings
      WHERE tenant = ${tenant} AND platform = 'TICIMAX'
      LIMIT 1
    `;
    const row = rows[0] ?? {};
    const credentials: Record<string, string> = {};
    const serviceEndpoint = this.text(row.serviceEndpoint);
    const wsdlUrl = this.text(row.wsdlUrl);
    const secretValue = this.text(row.secretValue);
    if (serviceEndpoint) credentials.SERVICE_ENDPOINT = serviceEndpoint;
    if (wsdlUrl) credentials.WSDL_URL = wsdlUrl;
    if (secretValue) credentials.UYE_KODU = this.credentialVault.decrypt(secretValue);
    const orderEndpoint = serviceEndpoint.replace(/UrunServis\.svc/i, 'SiparisServis.svc');
    if (orderEndpoint && orderEndpoint !== serviceEndpoint) credentials.ORDER_SERVICE_ENDPOINT = orderEndpoint;
    return credentials;
  }

  async analyzeCredentialScreenshot(file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Ekran goruntusu yuklenmelidir.');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Yalnizca gorsel dosyasi yuklenebilir.');

    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('Gorselden okuma icin GEMINI_API_KEY tanimli degil.');
    }

    const model = this.config.get<string>('GEMINI_VISION_MODEL')?.trim() || this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-3.6-flash';
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          text: [
            'Bu pazaryeri entegrasyon ekran goruntusunden API bilgilerini oku.',
            'Yalnizca gecerli JSON dondur. Markdown kullanma.',
            'Sema: {"platform":"TRENDYOL|HEPSIBURADA|N11|TICIMAX|null","accountName":"","externalAccountId":"","credentials":{"SUPPLIER_ID":"","MERCHANT_ID":"","API_KEY":"","API_SECRET":"","UYE_KODU":"","TOKEN":"","USERNAME":"","PASSWORD":"","USER_AGENT":""},"confidence":0.0}',
            'Gorunmeyen veya emin olmadigin alanlari bos string yap. Sifre/secret alanlarini tahmin etme.',
          ].join('\n'),
        },
        {
          inlineData: {
            mimeType: file.mimetype,
            data: file.buffer.toString('base64'),
          },
        },
      ],
      config: { responseMimeType: 'application/json' },
    });

    return this.parseScreenshotResponse(response.text ?? '');
  }

  listChannels() {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, code, name, channel_type AS "channelType", is_active AS "isActive",
        supports_products AS "supportsProducts", supports_stock AS "supportsStock",
        supports_price AS "supportsPrice", supports_orders AS "supportsOrders",
        supports_webhooks AS "supportsWebhooks", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM sales_channels
      ORDER BY name ASC
    `;
  }

  listAccounts() {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT a.id, a.company_id AS "companyId", c.name AS "companyName",
        a.sales_channel_id AS "salesChannelId", sc.code AS "channelCode", sc.name AS "channelName",
        a.name, a.external_account_id AS "externalAccountId", a.status,
        a.is_active AS "isActive", a.is_test_mode AS "isTestMode",
        a.last_connection_test_at AS "lastConnectionTestAt",
        a.last_connection_status AS "lastConnectionStatus",
        COUNT(DISTINCT cr.id)::int AS "credentialCount",
        COUNT(DISTINCT m.id)::int AS "productMappingCount"
      FROM channel_accounts a
      JOIN companies c ON c.id = a.company_id
      JOIN sales_channels sc ON sc.id = a.sales_channel_id
      LEFT JOIN channel_credentials cr ON cr.channel_account_id = a.id AND cr.is_active = true
      LEFT JOIN channel_product_mappings m ON m.channel_account_id = a.id AND m.is_active = true
      GROUP BY a.id, c.name, sc.code, sc.name
      ORDER BY c.name ASC, sc.name ASC, a.name ASC
    `;
  }

  async createAccount(payload: AccountPayload) {
    const companyId = this.requiredInt(payload.companyId, 'companyId');
    const salesChannelId = this.requiredInt(payload.salesChannelId, 'salesChannelId');
    const name = this.requiredText(payload.name, 'name');
    const externalAccountId = this.text(payload.externalAccountId) || null;
    const isTestMode = this.boolean(payload.isTestMode, true);

    await this.ensureCompany(companyId);
    await this.ensureSalesChannel(salesChannelId);
    const [row] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO channel_accounts (
        company_id, sales_channel_id, name, external_account_id, is_test_mode, created_at, updated_at
      )
      VALUES (${companyId}, ${salesChannelId}, ${name}, ${externalAccountId}, ${isTestMode}, NOW(), NOW())
      RETURNING id
    `;
    return this.getAccount(Number(row.id));
  }

  async updateAccount(id: number, payload: AccountPayload) {
    await this.ensureAccount(id);
    const name = this.text(payload.name) || null;
    const externalAccountId = this.hasField(payload, 'externalAccountId') ? this.text(payload.externalAccountId) || null : null;
    const status = this.enumValue(payload.status, accountStatuses, 'status');
    const isActive = this.optionalBoolean(payload.isActive) ?? null;
    const isTestMode = this.optionalBoolean(payload.isTestMode) ?? null;

    await this.prisma.$executeRaw`
      UPDATE channel_accounts
      SET name = COALESCE(${name}, name),
        external_account_id = COALESCE(${externalAccountId}, external_account_id),
        status = COALESCE(${status}, status::text)::"ChannelAccountStatus",
        is_active = COALESCE(${isActive}, is_active),
        is_test_mode = COALESCE(${isTestMode}, is_test_mode),
        updated_at = NOW()
      WHERE id = ${id}
    `;
    return this.getAccount(id);
  }

  async addCredential(accountId: number, payload: CredentialPayload) {
    await this.ensureAccount(accountId);
    const credentialType = this.enumValue(payload.credentialType, credentialTypes, 'credentialType') ?? 'OTHER';
    const value = this.requiredText(payload.value, 'value');
    const encryptedValue = this.credentialVault.encrypt(value);
    const maskedValue = this.credentialVault.mask(value);

    await this.prisma.$executeRaw`
      INSERT INTO channel_credentials (
        channel_account_id, credential_type, encrypted_value, masked_value, is_active, created_at, updated_at, rotated_at
      )
      VALUES (${accountId}, ${credentialType}::"ChannelCredentialType", ${encryptedValue}, ${maskedValue}, true, NOW(), NOW(), NOW())
      ON CONFLICT (channel_account_id, credential_type) DO UPDATE SET
        encrypted_value = EXCLUDED.encrypted_value,
        masked_value = EXCLUDED.masked_value,
        is_active = true,
        rotated_at = NOW(),
        updated_at = NOW()
    `;
    await this.prisma.$executeRaw`
      UPDATE channel_accounts
      SET status = 'CONFIGURED'::"ChannelAccountStatus", updated_at = NOW()
      WHERE id = ${accountId} AND status = 'NOT_CONFIGURED'::"ChannelAccountStatus"
    `;
    return this.listCredentials(accountId);
  }

  async listCredentials(accountId: number) {
    await this.ensureAccount(accountId);
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, channel_account_id AS "channelAccountId", credential_type AS "credentialType",
        masked_value AS "maskedValue", is_active AS "isActive", rotated_at AS "rotatedAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM channel_credentials
      WHERE channel_account_id = ${accountId}
      ORDER BY credential_type ASC
    `;
  }

  async testAccount(accountId: number) {
    const account = await this.ensureAccount(accountId);
    const platform = this.text(account.channelCode).toUpperCase();
    const adapter = await this.adapterForPlatform(platform);
    const result: AdapterConnectionResult = await adapter.testConnection();
    await this.prisma.$executeRaw`
      UPDATE channel_accounts
      SET status = ${result.ok ? 'CONNECTED' : result.status === 'MISSING_CREDENTIALS' ? 'NOT_CONFIGURED' : 'FAILED'}::"ChannelAccountStatus",
        last_connection_test_at = NOW(),
        last_connection_status = ${result.message},
        updated_at = NOW()
      WHERE id = ${accountId}
    `;
    return result;
  }

  listProductMappings() {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT m.id, m.company_id AS "companyId", c.name AS "companyName",
        m.sales_channel_id AS "salesChannelId", sc.code AS "channelCode", sc.name AS "channelName",
        m.channel_account_id AS "channelAccountId", a.name AS "accountName",
        m.product_id AS "productId", m.trendyol_product_variant_id AS "trendyolProductVariantId",
        m.stock_card_id AS "stockCardId", m.external_product_id AS "externalProductId",
        m.external_variant_id AS "externalVariantId", m.external_sku AS "externalSku",
        m.external_barcode AS "externalBarcode", m.publication_status AS "publicationStatus",
        m.is_active AS "isActive", m.last_synced_at AS "lastSyncedAt",
        m.created_at AS "createdAt", m.updated_at AS "updatedAt"
      FROM channel_product_mappings m
      JOIN companies c ON c.id = m.company_id
      JOIN sales_channels sc ON sc.id = m.sales_channel_id
      JOIN channel_accounts a ON a.id = m.channel_account_id
      ORDER BY m.created_at DESC
      LIMIT 200
    `;
  }

  async createProductMapping(payload: MappingPayload) {
    const channelAccountId = this.requiredInt(payload.channelAccountId, 'channelAccountId');
    const account = await this.ensureAccount(channelAccountId);
    const companyId = this.optionalInt(payload.companyId) ?? Number(account.companyId);
    const salesChannelId = this.optionalInt(payload.salesChannelId) ?? Number(account.salesChannelId);
    const productId = this.optionalInt(payload.productId);
    const trendyolProductVariantId = this.optionalInt(payload.trendyolProductVariantId);
    const stockCardId = this.optionalInt(payload.stockCardId);
    if (!productId && !trendyolProductVariantId && !stockCardId) {
      throw new BadRequestException('En az bir ERP kaynak baglantisi secilmelidir.');
    }

    const externalVariantId = this.text(payload.externalVariantId) || null;
    if (externalVariantId) {
      const duplicates = await this.prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM channel_product_mappings
        WHERE channel_account_id = ${channelAccountId} AND external_variant_id = ${externalVariantId}
        LIMIT 1
      `;
      if (duplicates[0]) throw new BadRequestException('Bu kanal hesabi ve dis varyasyon icin mapping zaten var.');
    }

    const publicationStatus = this.enumValue(payload.publicationStatus, publicationStatuses, 'publicationStatus') ?? 'DRAFT';
    await this.prisma.$executeRaw`
      INSERT INTO channel_product_mappings (
        company_id, sales_channel_id, channel_account_id, product_id, trendyol_product_variant_id, stock_card_id,
        external_product_id, external_variant_id, external_sku, external_barcode, publication_status, created_at, updated_at
      )
      VALUES (
        ${companyId}, ${salesChannelId}, ${channelAccountId}, ${productId}, ${trendyolProductVariantId}, ${stockCardId},
        ${this.text(payload.externalProductId) || null}, ${externalVariantId}, ${this.text(payload.externalSku) || null},
        ${this.text(payload.externalBarcode) || null}, ${publicationStatus}::"ChannelPublicationStatus", NOW(), NOW()
      )
    `;
    return this.listProductMappings();
  }

  async dryRunProduct(payload: DryRunPayload, userId: number) {
    const mode = this.text(payload.mode).toUpperCase() || 'DRY_RUN';
    if (mode !== 'DRY_RUN') throw new BadRequestException('Bu sprintte yalnizca DRY_RUN desteklenir.');
    const channelAccountId = this.requiredInt(payload.channelAccountId, 'channelAccountId');
    const account = await this.ensureAccount(channelAccountId);
    const source = await this.loadReadonlyProductSource(payload);
    const channelPayload = this.mapToChannelPayload(source);
    const preview = this.mockAdapter.previewProduct(channelPayload);

    const result = await this.prisma.$transaction(async (tx) => {
      const [job] = await tx.$queryRaw<Array<{ id: number }>>`
        INSERT INTO integration_sync_jobs (
          company_id, sales_channel_id, channel_account_id, job_type, mode, status, requested_by_user_id,
          started_at, completed_at, total_items, successful_items, failed_items, created_at, updated_at
        )
        VALUES (
          ${Number(account.companyId)}, ${Number(account.salesChannelId)}, ${channelAccountId}, 'PRODUCT_PREVIEW'::"IntegrationJobType",
          'DRY_RUN'::"IntegrationJobMode", 'SUCCESS'::"IntegrationJobStatus", ${userId}, NOW(), NOW(), 1, 1, 0, NOW(), NOW()
        )
        RETURNING id
      `;
      await tx.$executeRaw`
        INSERT INTO integration_sync_logs (
          sync_job_id, platform, action, status, message, entity_type, entity_id, operation,
          started_at, completed_at, payload_summary, created_at
        )
        VALUES (
          ${Number(job.id)}, ${String(account.channelCode)}, 'DRY_RUN_PRODUCT', 'SUCCESS', 'Mock product dry-run tamamlandi.',
          ${source.entityType}, ${String(source.entityId)}, 'PREVIEW_PRODUCT', NOW(), NOW(),
          ${JSON.stringify(this.safePayloadSummary(source, preview))}::jsonb, NOW()
        )
      `;
      return job;
    });

    return {
      syncJobId: Number(result.id),
      source,
      preview,
    };
  }

  listSyncJobs() {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT j.id, j.company_id AS "companyId", c.name AS "companyName",
        j.sales_channel_id AS "salesChannelId", sc.code AS "channelCode", sc.name AS "channelName",
        j.channel_account_id AS "channelAccountId", a.name AS "accountName",
        j.job_type AS "jobType", j.mode, j.status, j.requested_by_user_id AS "requestedByUserId",
        j.started_at AS "startedAt", j.completed_at AS "completedAt",
        j.total_items AS "totalItems", j.successful_items AS "successfulItems", j.failed_items AS "failedItems",
        j.created_at AS "createdAt", j.updated_at AS "updatedAt"
      FROM integration_sync_jobs j
      JOIN companies c ON c.id = j.company_id
      JOIN sales_channels sc ON sc.id = j.sales_channel_id
      JOIN channel_accounts a ON a.id = j.channel_account_id
      ORDER BY j.created_at DESC
      LIMIT 100
    `;
  }

  async getSyncJob(id: number) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT j.id, j.company_id AS "companyId", c.name AS "companyName",
        j.sales_channel_id AS "salesChannelId", sc.code AS "channelCode", sc.name AS "channelName",
        j.channel_account_id AS "channelAccountId", a.name AS "accountName",
        j.job_type AS "jobType", j.mode, j.status, j.requested_by_user_id AS "requestedByUserId",
        j.started_at AS "startedAt", j.completed_at AS "completedAt",
        j.total_items AS "totalItems", j.successful_items AS "successfulItems", j.failed_items AS "failedItems",
        j.created_at AS "createdAt", j.updated_at AS "updatedAt"
      FROM integration_sync_jobs j
      JOIN companies c ON c.id = j.company_id
      JOIN sales_channels sc ON sc.id = j.sales_channel_id
      JOIN channel_accounts a ON a.id = j.channel_account_id
      WHERE j.id = ${id}
      LIMIT 1
    `;
    if (!rows[0]) throw new NotFoundException('Senkronizasyon isi bulunamadi.');
    const logs = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, platform, action, status, message, entity_type AS "entityType", entity_id AS "entityId",
        operation, payload_summary AS "payloadSummary", created_at AS "createdAt"
      FROM integration_sync_logs
      WHERE sync_job_id = ${id}
      ORDER BY created_at ASC
    `;
    return { ...rows[0], logs };
  }

  private async getAccount(id: number) {
    const [row] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT a.id, a.company_id AS "companyId", c.name AS "companyName",
        a.sales_channel_id AS "salesChannelId", sc.code AS "channelCode", sc.name AS "channelName",
        a.name, a.external_account_id AS "externalAccountId", a.status,
        a.is_active AS "isActive", a.is_test_mode AS "isTestMode",
        a.last_connection_test_at AS "lastConnectionTestAt",
        a.last_connection_status AS "lastConnectionStatus"
      FROM channel_accounts a
      JOIN companies c ON c.id = a.company_id
      JOIN sales_channels sc ON sc.id = a.sales_channel_id
      WHERE a.id = ${id}
      LIMIT 1
    `;
    if (!row) throw new NotFoundException('Kanal hesabi bulunamadi.');
    return row;
  }

  private async ensureAccount(id: number) {
    return this.getAccount(id);
  }

  private async ensureCompany(id: number) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM companies WHERE id = ${id} LIMIT 1`;
    if (!rows[0]) throw new NotFoundException('Sirket bulunamadi.');
  }

  private async ensureSalesChannel(id: number) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM sales_channels WHERE id = ${id} LIMIT 1`;
    if (!rows[0]) throw new NotFoundException('Satis kanali bulunamadi.');
  }

  private async ensureManagedIntegrationSeed() {
    await this.prisma.$executeRaw`
      INSERT INTO companies (code, name, legal_name, domain, is_active, created_at, updated_at)
      VALUES ('ERHAN', 'Erhan Flowers', 'Erhan Flowers', 'erhanflowers.com', true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = true, updated_at = NOW()
    `;

    for (const platform of managedPlatforms) {
      const channelType = platform === 'TICIMAX' ? 'WEBSITE' : 'MARKETPLACE';
      await this.prisma.$executeRaw`
        INSERT INTO sales_channels (
          code, name, channel_type, is_active, supports_products, supports_stock, supports_price, supports_orders, supports_webhooks, created_at, updated_at
        )
        VALUES (
          ${platform}, ${managedPlatformNames[platform]}, ${channelType}::"IntegrationChannelType", true, true, true, true, true, false, NOW(), NOW()
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          is_active = true,
          supports_products = true,
          supports_stock = true,
          supports_price = true,
          supports_orders = true,
          updated_at = NOW()
      `;
    }
  }

  private async ensureManagedAccount(platform: string, accountName: string, externalAccountId: string | null, isTestMode: boolean) {
    const [company] = await this.prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM companies WHERE code = 'ERHAN' LIMIT 1`;
    const [channel] = await this.prisma.$queryRaw<Array<{ id: number }>>`SELECT id FROM sales_channels WHERE code = ${platform} LIMIT 1`;
    if (!company || !channel) throw new BadRequestException('Entegrasyon temel kayitlari hazirlanamadi.');

    const [existing] = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM channel_accounts
      WHERE company_id = ${company.id} AND sales_channel_id = ${channel.id} AND is_active = true
      ORDER BY id ASC
      LIMIT 1
    `;
    if (existing) return Number(existing.id);

    const [created] = await this.prisma.$queryRaw<Array<{ id: number }>>`
      INSERT INTO channel_accounts (
        company_id, sales_channel_id, name, external_account_id, status, is_active, is_test_mode, created_at, updated_at
      )
      VALUES (
        ${company.id}, ${channel.id}, ${accountName}, ${externalAccountId}, 'NOT_CONFIGURED'::"ChannelAccountStatus", true, ${isTestMode}, NOW(), NOW()
      )
      RETURNING id
    `;
    return Number(created.id);
  }

  private managedPlatform(value: unknown) {
    const platform = this.text(value).toUpperCase();
    if (managedPlatforms.includes(platform as (typeof managedPlatforms)[number])) return platform;
    throw new BadRequestException('Platform desteklenmiyor.');
  }

  private credentialTypeForField(field: string) {
    if (field === 'MERCHANT_ID') return 'SUPPLIER_ID';
    if (field === 'USER_AGENT') return 'OTHER';
    if (credentialTypes.has(field)) return field;
    return 'OTHER';
  }

  private displayCredentialField(platform: string, credentialType: string) {
    if ((platform === 'HEPSIBURADA' || platform === 'N11') && credentialType === 'SUPPLIER_ID') return 'MERCHANT_ID';
    if (platform === 'HEPSIBURADA' && credentialType === 'OTHER') return 'USER_AGENT';
    return credentialType;
  }

  private runtimeCredentialField(platform: string, credentialType: string) {
    const displayField = this.displayCredentialField(platform, credentialType);
    if (displayField === 'MERCHANT_ID') return 'MERCHANT_ID';
    if (displayField === 'API_KEY') return 'API_KEY';
    if (displayField === 'API_SECRET') return 'API_SECRET';
    if (displayField === 'USER_AGENT') return 'USER_AGENT';
    if (displayField === 'SUPPLIER_ID') return 'SUPPLIER_ID';
    if (displayField === 'TOKEN') return 'TOKEN';
    if (displayField === 'USERNAME') return 'USERNAME';
    if (displayField === 'PASSWORD') return 'PASSWORD';
    return '';
  }

  private parseScreenshotResponse(text: string) {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned || '{}') as Record<string, unknown>;
    const platformText = this.text(parsed.platform).toUpperCase();
    const platform = managedPlatforms.includes(platformText as (typeof managedPlatforms)[number]) ? platformText : null;
    const rawCredentials = (parsed.credentials ?? {}) as Record<string, unknown>;
    const credentials = Object.fromEntries(
      ['SUPPLIER_ID', 'MERCHANT_ID', 'API_KEY', 'API_SECRET', 'UYE_KODU', 'TOKEN', 'USERNAME', 'PASSWORD', 'USER_AGENT']
        .map((key) => [key, this.text(rawCredentials[key])])
        .filter(([, value]) => Boolean(value)),
    );

    return {
      platform,
      accountName: this.text(parsed.accountName),
      externalAccountId: this.text(parsed.externalAccountId),
      credentials,
      confidence: Number(parsed.confidence || 0),
    };
  }

  private async loadReadonlyProductSource(payload: DryRunPayload) {
    const productId = this.optionalInt(payload.productId);
    const trendyolProductVariantId = this.optionalInt(payload.trendyolProductVariantId);
    const stockCardId = this.optionalInt(payload.stockCardId);
    if (!productId && !trendyolProductVariantId && !stockCardId) {
      throw new BadRequestException('Dry-run icin urun, varyasyon veya stok karti secilmelidir.');
    }

    if (trendyolProductVariantId) {
      const [variant] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, product_name AS "productName", barcode, current_model_code AS "currentModelCode",
          supplier_stock_code AS "supplierStockCode", proposed_model_code AS "proposedModelCode",
          stock_quantity AS "stockQuantity", trendyol_sale_price AS "salePrice", commission_percent AS "commissionPercent",
          images
        FROM trendyol_product_variants
        WHERE id = ${trendyolProductVariantId}
        LIMIT 1
      `;
      if (!variant) throw new NotFoundException('Varyasyon bulunamadi.');
      return { entityType: 'TRENDYOL_PRODUCT_VARIANT', entityId: trendyolProductVariantId, variant, product: null, stockCard: null };
    }

    if (stockCardId) {
      const [stockCard] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, name AS "productName", sku, barcode, model, stock_quantity AS "stockQuantity",
          sale_price AS "salePrice", automatic_unit_cost AS "automaticUnitCost",
          manual_unit_cost_enabled AS "manualUnitCostEnabled", manual_unit_cost AS "manualUnitCost",
          image_path AS "imagePath"
        FROM stock_cards
        WHERE id = ${stockCardId}
        LIMIT 1
      `;
      if (!stockCard) throw new NotFoundException('Stok karti bulunamadi.');
      return { entityType: 'STOCK_CARD', entityId: stockCardId, stockCard, product: null, variant: null };
    }

    const [product] = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, product_name AS "productName", model_code AS "modelCode", barcode,
        stock_quantity AS "stockQuantity"
      FROM products
      WHERE id = ${productId}
      LIMIT 1
    `;
    if (!product) throw new NotFoundException('Urun bulunamadi.');
    return { entityType: 'PRODUCT', entityId: productId, product, variant: null, stockCard: null };
  }

  private mapToChannelPayload(source: Record<string, unknown>) {
    const variant = (source.variant ?? null) as Record<string, unknown> | null;
    const stockCard = (source.stockCard ?? null) as Record<string, unknown> | null;
    const product = (source.product ?? null) as Record<string, unknown> | null;
    const sourceRow = variant ?? stockCard ?? product ?? {};
    const unitCost = stockCard
      ? Number(stockCard.manualUnitCostEnabled ? stockCard.manualUnitCost ?? 0 : stockCard.automaticUnitCost ?? 0)
      : null;

    return {
      sourceType: source.entityType,
      sourceId: source.entityId,
      productName: sourceRow.productName ?? null,
      barcode: sourceRow.barcode ?? null,
      sku: sourceRow.supplierStockCode ?? sourceRow.sku ?? sourceRow.modelCode ?? sourceRow.currentModelCode ?? sourceRow.model ?? null,
      stockQuantity: sourceRow.stockQuantity ?? null,
      salePrice: sourceRow.salePrice ?? null,
      unitCost,
      images: sourceRow.images ?? sourceRow.imagePath ?? null,
    };
  }

  private safePayloadSummary(source: Record<string, unknown>, preview: Record<string, unknown>) {
    return {
      entityType: source.entityType,
      entityId: source.entityId,
      operation: preview.operation,
      warningCount: Array.isArray(preview.warnings) ? preview.warnings.length : 0,
      errorCount: Array.isArray(preview.errors) ? preview.errors.length : 0,
      changedFieldCount: Array.isArray(preview.changes) ? preview.changes.length : 0,
    };
  }

  private requiredText(value: unknown, label: string) {
    const text = this.text(value);
    if (!text) throw new BadRequestException(`${label} zorunludur.`);
    return text;
  }

  private text(value: unknown) {
    return String(value ?? '').trim();
  }

  private requiredInt(value: unknown, label: string) {
    const parsed = this.optionalInt(value);
    if (!parsed) throw new BadRequestException(`${label} zorunludur.`);
    return parsed;
  }

  private optionalInt(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private boolean(value: unknown, fallback: boolean) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  private optionalBoolean(value: unknown) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private enumValue(value: unknown, allowed: Set<string>, label: string) {
    const text = this.text(value).toUpperCase();
    if (!text) return null;
    if (!allowed.has(text)) throw new BadRequestException(`${label} gecersiz.`);
    return text;
  }

  private hasField(body: object, key: string) {
    return Object.prototype.hasOwnProperty.call(body, key);
  }

  private async adapterForPlatform(platform: string): Promise<IntegrationAdapter> {
    if (platform === 'TRENDYOL') return new TrendyolAdapter(await this.runtimeCredentials(platform));
    if (platform === 'HEPSIBURADA') return new HepsiburadaAdapter(await this.runtimeCredentials(platform));
    if (platform === 'N11') return new N11Adapter(await this.runtimeCredentials(platform));
    if (platform === 'TICIMAX') return new TicimaxAdapter(await this.ticimaxRuntimeCredentials());
    throw new BadRequestException('Platform desteklenmiyor.');
  }
}
