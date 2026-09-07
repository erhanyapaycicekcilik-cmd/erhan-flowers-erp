import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string } }>;
  };
}

@Injectable()
export class GmailOrderService {
  private readonly logger = new Logger(GmailOrderService.name);
  private readonly clientId = process.env.GMAIL_CLIENT_ID ?? '';
  private readonly clientSecret = process.env.GMAIL_CLIENT_SECRET ?? '';
  private readonly redirectUri = process.env.GMAIL_REDIRECT_URI ?? '';

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<boolean> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) {
      this.logger.error(`Token exchange failed: ${await res.text()}`);
      return false;
    }
    const tokens = await res.json() as GmailTokens;
    await this.saveTokens(tokens);
    return true;
  }

  private async saveTokens(tokens: GmailTokens) {
    await this.prisma.$executeRaw`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('GMAIL_TOKENS', ${JSON.stringify(tokens)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(tokens)}, updated_at = NOW()
    `;
  }

  private async loadTokens(): Promise<GmailTokens | null> {
    const rows = await this.prisma.$queryRaw<Array<{ value: string }>>`
      SELECT value FROM app_settings WHERE key = 'GMAIL_TOKENS' LIMIT 1
    `;
    if (!rows.length) return null;
    try { return JSON.parse(rows[0].value) as GmailTokens; } catch { return null; }
  }

  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as GmailTokens;
    const existing = await this.loadTokens();
    await this.saveTokens({ ...existing, ...data, refresh_token: existing?.refresh_token });
    return data.access_token;
  }

  private async getAccessToken(): Promise<string | null> {
    const tokens = await this.loadTokens();
    if (!tokens) return null;
    if (tokens.expiry_date && tokens.expiry_date > Date.now() + 60000) return tokens.access_token;
    if (tokens.refresh_token) return this.refreshAccessToken(tokens.refresh_token);
    return null;
  }

  private async gmailGet<T>(path: string): Promise<T | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  }

  @Cron('*/10 * * * *')
  async pollNewOrderEmails() {
    try {
      await this.syncHepsiburadaOrders();
      await this.syncN11Orders();
    } catch (err) {
      this.logger.error('Gmail poll hatasi', err instanceof Error ? err.message : String(err));
    }
  }

  async syncHepsiburadaOrders() {
    const token = await this.getAccessToken();
    if (!token) { this.logger.warn('Gmail token yok — önce OAuth bağlantısı yapın.'); return; }

    const data = await this.gmailGet<{ messages?: Array<{ id: string }> }>(
      `/messages?q=from:noreply@hepsiburada.com+subject:siparişiniz+newer_than:1d&maxResults=20`,
    );
    if (!data?.messages?.length) return;

    for (const msg of data.messages) {
      await this.processEmail(msg.id, 'HEPSIBURADA');
    }
  }

  async syncN11Orders() {
    const token = await this.getAccessToken();
    if (!token) return;

    const data = await this.gmailGet<{ messages?: Array<{ id: string }> }>(
      `/messages?q=from:info.n11.com+subject:sipariş+newer_than:1d&maxResults=20`,
    );
    if (!data?.messages?.length) return;

    for (const msg of data.messages) {
      await this.processEmail(msg.id, 'N11');
    }
  }

  private async processEmail(messageId: string, platform: string) {
    // Daha önce işlendiyse atla
    const existing = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM marketplace_orders WHERE platform = ${platform} AND external_order_id = ${'email_' + messageId} LIMIT 1
    `;
    if (existing.length) return;

    const msg = await this.gmailGet<GmailMessage>(`/messages/${messageId}?format=full`);
    if (!msg) return;

    const subject = msg.payload?.headers?.find((h) => h.name === 'Subject')?.value ?? '';
    const snippet = msg.snippet ?? '';

    // Sipariş numarasını çıkar
    const orderMatch = snippet.match(/sipari[sş]\s*(no|numaras[ıi])?[:\s#]*([A-Z0-9\-]+)/i)
      ?? subject.match(/([A-Z0-9]{8,})/);
    const externalOrderId = orderMatch?.[2] ?? orderMatch?.[1] ?? `email_${messageId}`;

    // E-postadan tutarı çıkar
    const amountMatch = snippet.match(/([\d.,]+)\s*TL/i);
    const totalAmount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

    await this.prisma.$executeRaw`
      INSERT INTO marketplace_orders (
        platform, external_order_id, status, total_amount, customer_name,
        order_date, created_at, updated_at
      ) VALUES (
        ${platform}, ${'email_' + messageId}, 'Yeni',
        ${totalAmount}, ${'E-posta: ' + subject.slice(0, 100)},
        NOW(), NOW(), NOW()
      ) ON CONFLICT (platform, external_order_id) DO NOTHING
    `;

    this.logger.log(`${platform} sipariş e-postası işlendi: ${subject.slice(0, 60)}`);
  }

  async getStatus(): Promise<{ connected: boolean; lastCheck?: string }> {
    const tokens = await this.loadTokens();
    return { connected: Boolean(tokens?.access_token) };
  }
}
