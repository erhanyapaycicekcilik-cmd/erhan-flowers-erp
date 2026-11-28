import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { FLORA_SITE_SUBCATEGORY } from '../../common/store';
import { PrismaService } from '../../prisma/prisma.service';

type DriveTokens = { access_token?: string; refresh_token?: string; expiry_date?: number; email?: string };

// Flora saksısız ağaçlarının fotoğraflarını Google Drive'a yükler:
//   Drive / "Flora Saksısız" / "<model kodu> <ürün adı>" / 1-foto.jpg, 2-foto.jpg …
// Google bağlantısı Gmail ile aynı OAuth uygulamasını kullanır (GMAIL_CLIENT_ID/SECRET/REDIRECT_URI),
// izin kapsamı drive.file: uygulama sadece kendi açtığı klasör/dosyaları görür, Drive'daki diğer dosyalara dokunamaz.
// Token: app_settings.DRIVE_TOKENS, ana klasör id: app_settings.DRIVE_FLORA_ROOT_FOLDER.
const ROOT_FOLDER_NAME = 'Flora Saksısız';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

@Injectable()
export class DriveSyncService {
  private readonly logger = new Logger(DriveSyncService.name);
  private readonly clientId = process.env.GMAIL_CLIENT_ID ?? '';
  private readonly clientSecret = process.env.GMAIL_CLIENT_SECRET ?? '';
  private readonly redirectUri = process.env.GMAIL_REDIRECT_URI ?? '';
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file',
      access_type: 'offline',
      prompt: 'consent select_account',
      state: 'drive',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<boolean> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: this.clientId, client_secret: this.clientSecret, redirect_uri: this.redirectUri, grant_type: 'authorization_code' }),
    });
    if (!res.ok) {
      this.logger.error(`Drive token alınamadı: ${await res.text()}`);
      return false;
    }
    const tokens = (await res.json()) as DriveTokens & { expires_in?: number };
    if (tokens.expires_in) tokens.expiry_date = Date.now() + tokens.expires_in * 1000;
    const about = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }).then((r) => (r.ok ? (r.json() as Promise<{ user?: { emailAddress?: string } }>) : null)).catch(() => null);
    const previous = await this.loadTokens();
    await this.saveSetting('DRIVE_TOKENS', JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? previous?.refresh_token,
      expiry_date: tokens.expiry_date,
      email: about?.user?.emailAddress ?? previous?.email,
    }));
    // Hesap değiştiyse eski ana klasör id'si geçersiz olur
    if (previous?.email && about?.user?.emailAddress && previous.email !== about.user.emailAddress) {
      await this.saveSetting('DRIVE_FLORA_ROOT_FOLDER', '');
    }
    this.logger.log(`Google Drive bağlandı: ${about?.user?.emailAddress ?? '?'}`);
    void this.syncPending();
    return true;
  }

  async status() {
    const tokens = await this.loadTokens();
    const pending = await this.prisma.trendyolProductVariant.count({ where: this.pendingWhere() });
    const done = await this.prisma.trendyolProductVariant.count({
      where: { storeCode: 'FLORA', catalogSubCategory: FLORA_SITE_SUBCATEGORY, driveFolderId: { not: null } },
    });
    const rootId = await this.loadSetting('DRIVE_FLORA_ROOT_FOLDER');
    return {
      connected: Boolean(tokens?.refresh_token),
      email: tokens?.email ?? null,
      folderName: ROOT_FOLDER_NAME,
      folderUrl: rootId ? `https://drive.google.com/drive/folders/${rootId}` : null,
      pending,
      done,
    };
  }

  private pendingWhere() {
    return { storeCode: 'FLORA', catalogSubCategory: FLORA_SITE_SUBCATEGORY, status: 'ACTIVE' as const, driveFolderId: null };
  }

  @Cron('*/10 * * * *')
  async cron() {
    await this.syncPending().catch((error) => this.logger.warn(`Drive senkron hatası: ${this.message(error)}`));
  }

  // Drive klasörü olmayan Flora saksısız ağaçları için klasör açar ve fotoğrafları yükler.
  async syncPending(limit = 20) {
    if (this.running) return { ok: false, message: 'Senkron zaten çalışıyor.', synced: 0, failed: 0 };
    const token = await this.accessToken();
    if (!token) return { ok: false, message: 'Google Drive bağlı değil.', synced: 0, failed: 0 };
    this.running = true;
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    try {
      let rootId: string;
      try {
        rootId = await this.rootFolder();
      } catch (error) {
        // Ör. "Google Drive API has not been used in project … or it is disabled" → kullanıcıya aynen göster
        const message = this.message(error);
        this.logger.warn(`Drive ana klasörü açılamadı: ${message}`);
        return { ok: false, synced: 0, failed: 0, errors: [message], message: `Drive'a erişilemedi: ${this.driveHint(message)}` };
      }
      const variants = await this.prisma.trendyolProductVariant.findMany({
        where: this.pendingWhere(),
        select: { id: true, productName: true, currentModelCode: true, barcode: true, images: true, product: { select: { imageUrls: true } } },
        orderBy: { id: 'asc' },
        take: limit,
      });
      for (const variant of variants) {
        try {
          const folderName = this.safeName(`${variant.currentModelCode ?? variant.barcode} ${variant.productName}`);
          const folderId = await this.findOrCreateFolder(folderName, rootId);
          const images = this.imageList(variant.images, variant.product?.imageUrls);
          let index = 0;
          for (const src of images) {
            index += 1;
            const file = await this.readImage(src);
            if (!file) continue;
            const ext = path.extname(src.split('?')[0]) || this.extFromMime(file.mime);
            await this.uploadFile(folderId, `${index}-${this.safeName(variant.productName).slice(0, 80)}${ext}`, file.data, file.mime);
          }
          await this.prisma.trendyolProductVariant.update({ where: { id: variant.id }, data: { driveFolderId: folderId } });
          synced += 1;
        } catch (error) {
          failed += 1;
          errors.push(`${variant.productName}: ${this.message(error)}`);
        }
      }
      if (synced || failed) this.logger.log(`Drive (${ROOT_FOLDER_NAME}): ${synced} ürün yüklendi, ${failed} hata`);
      return { ok: failed === 0, synced, failed, errors: errors.slice(0, 5), message: `${synced} ürün Drive'a yüklendi${failed ? `, ${failed} hata` : ''}.` };
    } finally {
      this.running = false;
    }
  }

  // ── Drive yardımcıları ──────────────────────────────────────────────────
  private async rootFolder(): Promise<string> {
    const saved = await this.loadSetting('DRIVE_FLORA_ROOT_FOLDER');
    if (saved) {
      const res = await this.api(`/drive/v3/files/${encodeURIComponent(saved)}?fields=id,trashed`);
      if (res.ok) {
        const file = (await res.json()) as { trashed?: boolean };
        if (!file.trashed) return saved;
      }
    }
    const id = await this.findOrCreateFolder(ROOT_FOLDER_NAME);
    await this.saveSetting('DRIVE_FLORA_ROOT_FOLDER', id);
    return id;
  }

  private async findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const q = [`name = '${escaped}'`, `mimeType = '${FOLDER_MIME}'`, 'trashed = false', parentId ? `'${parentId}' in parents` : ''].filter(Boolean).join(' and ');
    const found = await this.api(`/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
    if (found.ok) {
      const data = (await found.json()) as { files?: Array<{ id: string }> };
      if (data.files?.[0]?.id) return data.files[0].id;
    }
    const created = await this.api('/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) }),
    });
    if (!created.ok) throw new Error(`Klasör açılamadı (HTTP ${created.status}): ${(await created.text()).slice(0, 200)}`);
    return ((await created.json()) as { id: string }).id;
  }

  private async uploadFile(parentId: string, name: string, data: Buffer, mime: string) {
    const boundary = `erp${Date.now().toString(36)}`;
    const meta = JSON.stringify({ name, parents: [parentId] });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
      data,
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    const res = await this.api('/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!res.ok) throw new Error(`Fotoğraf yüklenemedi (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
  }

  private imageList(images: unknown, productImages: unknown): string[] {
    const pick = (value: unknown): string[] => (Array.isArray(value) ? value : [])
      .map((item) => (typeof item === 'string' ? item : (item as Record<string, unknown>)?.url ?? (item as Record<string, unknown>)?.filePath))
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set([...pick(images), ...pick(productImages)])).slice(0, 15);
  }

  private async readImage(src: string): Promise<{ data: Buffer; mime: string } | null> {
    const clean = src.split('?')[0];
    if (!/^https?:\/\//i.test(src)) {
      const local = path.join(process.cwd(), clean.replace(/^\/+/, ''));
      if (fs.existsSync(local)) return { data: fs.readFileSync(local), mime: this.mimeFromExt(path.extname(local)) };
      const base = (process.env.PUBLIC_BASE_URL ?? 'https://api.erhanflowers.com').replace(/\/+$/, '');
      src = `${base}/${clean.replace(/^\/+/, '')}`;
    }
    const res = await fetch(src).catch(() => null);
    if (!res || !res.ok) return null;
    return { data: Buffer.from(await res.arrayBuffer()), mime: res.headers.get('content-type') || this.mimeFromExt(path.extname(clean)) };
  }

  private mimeFromExt(ext: string) {
    const e = ext.toLowerCase();
    return e === '.png' ? 'image/png' : e === '.webp' ? 'image/webp' : e === '.gif' ? 'image/gif' : 'image/jpeg';
  }

  private extFromMime(mime: string) {
    return mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : '.jpg';
  }

  private safeName(value: string) {
    return value.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150) || 'Urun';
  }

  private async api(pathname: string, init: RequestInit = {}) {
    const token = await this.accessToken();
    if (!token) throw new Error('Google Drive bağlı değil.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(`https://www.googleapis.com${pathname}`, { ...init, headers });
  }

  private async accessToken(): Promise<string | null> {
    const tokens = await this.loadTokens();
    if (!tokens?.refresh_token) return null;
    if (tokens.access_token && tokens.expiry_date && tokens.expiry_date > Date.now() + 60_000) return tokens.access_token;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: tokens.refresh_token, client_id: this.clientId, client_secret: this.clientSecret, grant_type: 'refresh_token' }),
    }).catch(() => null);
    if (!res || !res.ok) {
      this.logger.warn(`Drive token yenilenemedi${res ? `: HTTP ${res.status}` : ''}`);
      return null;
    }
    const data = (await res.json()) as { access_token: string; expires_in?: number };
    await this.saveSetting('DRIVE_TOKENS', JSON.stringify({ ...tokens, access_token: data.access_token, expiry_date: Date.now() + (data.expires_in ?? 3600) * 1000 }));
    return data.access_token;
  }

  private async loadTokens(): Promise<DriveTokens | null> {
    const raw = await this.loadSetting('DRIVE_TOKENS');
    try { return raw ? (JSON.parse(raw) as DriveTokens) : null; } catch { return null; }
  }

  private async loadSetting(key: string): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ value: string }>>`SELECT value FROM app_settings WHERE key = ${key} LIMIT 1`;
    return rows[0]?.value ?? '';
  }

  private async saveSetting(key: string, value: string) {
    await this.prisma.$executeRaw`
      INSERT INTO app_settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
    `;
  }

  private driveHint(message: string) {
    if (/has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(message)) {
      return "Google Cloud projesinde 'Google Drive API' kapalı. console.cloud.google.com → APIs & Services → Library → Google Drive API → Enable, birkaç dakika sonra tekrar deneyin.";
    }
    if (/insufficient|scope|401|invalid_grant/i.test(message)) return 'Drive izni geçersiz; "Google Drive\'ı bağla" ile yeniden bağlanın.';
    return message.slice(0, 300);
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
