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

  /** purpose = 'bills': fatura taraması için ek Gmail hesabı bağlanır (sipariş hesabını değiştirmez). */
  getAuthUrl(purpose?: string): string {
    const params = new URLSearchParams({
      ...(purpose === 'bills' ? { state: 'bills', prompt: 'consent select_account' } : {}),
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
    });
    if (!params.has('prompt')) params.set('prompt', 'consent');
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string, state?: string): Promise<boolean> {
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
    const tokens = await res.json() as GmailTokens & { expires_in?: number };
    if (tokens.expires_in) tokens.expiry_date = Date.now() + tokens.expires_in * 1000;
    if (state === 'bills') {
      const profile = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }).then((r) => (r.ok ? r.json() as Promise<{ emailAddress?: string }> : null)).catch(() => null);
      const email = profile?.emailAddress?.toLowerCase();
      if (!email) return false;
      const map = await this.loadBillMailboxMap();
      map[email] = { ...map[email], ...tokens, refresh_token: tokens.refresh_token ?? map[email]?.refresh_token };
      await this.saveSetting('BILL_GMAIL_ACCOUNTS', JSON.stringify(map));
      this.logger.log(`Fatura taraması için Gmail bağlandı: ${email}`);
      return true;
    }
    await this.saveTokens(tokens);
    return true;
  }

  // ─── Fatura taraması için ek Gmail hesapları ───────────────────────────────

  private async saveSetting(key: string, value: string) {
    await this.prisma.$executeRaw`
      INSERT INTO app_settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
    `;
  }

  private async loadBillMailboxMap(): Promise<Record<string, GmailTokens>> {
    const rows = await this.prisma.$queryRaw<Array<{ value: string }>>`
      SELECT value FROM app_settings WHERE key = 'BILL_GMAIL_ACCOUNTS' LIMIT 1
    `;
    try { return rows.length ? JSON.parse(rows[0].value) : {}; } catch { return {}; }
  }

  /** Taranacak posta kutuları: 'primary' (sipariş için bağlı hesap) + fatura için eklenen e-postalar. */
  async listMailboxes(): Promise<Array<{ id: string; email: string | null }>> {
    const out: Array<{ id: string; email: string | null }> = [];
    let primaryEmail: string | null = null;
    if (await this.getAccessToken()) {
      const prof = await this.gmailGet<{ emailAddress?: string }>('/profile');
      primaryEmail = prof?.emailAddress?.toLowerCase() ?? null;
      out.push({ id: 'primary', email: primaryEmail });
    }
    for (const email of Object.keys(await this.loadBillMailboxMap())) {
      if (email !== primaryEmail) out.push({ id: email, email });
    }
    return out;
  }

  async removeBillMailbox(email: string) {
    const map = await this.loadBillMailboxMap();
    delete map[email.toLowerCase()];
    await this.saveSetting('BILL_GMAIL_ACCOUNTS', JSON.stringify(map));
  }

  private async tokenFor(mailbox: string): Promise<string | null> {
    if (mailbox === 'primary') return this.getAccessToken();
    const map = await this.loadBillMailboxMap();
    const t = map[mailbox];
    if (!t) return null;
    if (t.expiry_date && t.expiry_date > Date.now() + 60000) return t.access_token;
    if (!t.refresh_token) return null;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: t.refresh_token, client_id: this.clientId, client_secret: this.clientSecret, grant_type: 'refresh_token' }),
    });
    if (!res.ok) { this.logger.warn(`Gmail yenilenemedi: ${mailbox}`); return null; }
    const data = await res.json() as GmailTokens & { expires_in?: number };
    map[mailbox] = { ...t, access_token: data.access_token, expiry_date: Date.now() + (data.expires_in ?? 3600) * 1000 };
    await this.saveSetting('BILL_GMAIL_ACCOUNTS', JSON.stringify(map));
    return data.access_token;
  }

  private async gmailGetAs<T>(mailbox: string, path: string): Promise<T | null> {
    if (mailbox === 'primary') return this.gmailGet<T>(path);
    const token = await this.tokenFor(mailbox);
    if (!token) return null;
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
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

  /** Gmail araması (q: Gmail arama sözdizimi). Bağlı değilse null döner. */
  async searchMessageIds(q: string, maxResults = 10, mailbox = 'primary'): Promise<string[] | null> {
    const token = await this.tokenFor(mailbox);
    if (!token) return null;
    const data = await this.gmailGetAs<{ messages?: Array<{ id: string }> }>(mailbox,
      `/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`,
    );
    return (data?.messages ?? []).map((m) => m.id);
  }

  /** Mesajın konu, gönderen, tarih ve düz metin içeriği (HTML etiketleri temizlenmiş). */
  async getMessageContent(messageId: string, mailbox = 'primary'): Promise<{ id: string; subject: string; from: string; date: Date | null; text: string } | null> {
    type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };
    const msg = await this.gmailGetAs<GmailMessage & { internalDate?: string }>(mailbox, `/messages/${messageId}?format=full`);
    if (!msg) return null;
    const header = (n: string) => msg.payload?.headers?.find((h) => h.name.toLowerCase() === n)?.value ?? '';
    const decode = (d?: string) => (d ? Buffer.from(d.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8') : '');
    const plain: string[] = [];
    const html: string[] = [];
    const walk = (p?: Part) => {
      if (!p) return;
      if (p.mimeType === 'text/plain') plain.push(decode(p.body?.data));
      else if (p.mimeType === 'text/html') html.push(decode(p.body?.data));
      p.parts?.forEach(walk);
    };
    walk(msg.payload as Part);
    if (!plain.length && !html.length && msg.payload?.body?.data) html.push(decode(msg.payload.body.data));
    const stripHtml = (h: string) =>
      h
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|tr|td|th|li|h\d)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)));
    const text = [...plain, ...html.map(stripHtml), msg.snippet ?? ''].join('\n').replace(/[ \t]+/g, ' ');
    return {
      id: msg.id,
      subject: header('subject'),
      from: header('from'),
      date: msg.internalDate ? new Date(Number(msg.internalDate)) : null,
      text,
    };
  }

  async getStatus(): Promise<{ connected: boolean; lastCheck?: string }> {
    const tokens = await this.loadTokens();
    return { connected: Boolean(tokens?.access_token) };
  }
}
