import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const EFT_DISCOUNT_RATE = 0.03; // %3 EFT indirimi
const EFT_EXPIRY_HOURS = 72;    // 3 gün geçerli

// Firma banka bilgileri — ortamdan veya sabit
const BANK_INFO = {
  bankName: process.env.EFT_BANK_NAME ?? 'Ziraat Bankası',
  iban: process.env.EFT_IBAN ?? 'TR00 0000 0000 0000 0000 0000 00',
  accountHolder: process.env.EFT_ACCOUNT_HOLDER ?? 'Erhan Yapaycicekcilik Tic. Ltd. Şti.',
};

@Injectable()
export class EftService {
  constructor(private readonly prisma: PrismaService) {}

  // EFT talebi oluştur — sipariş oluşturulduktan sonra çağrılır
  async createRequest(saleId: number) {
    const sale = await this.prisma.$queryRaw<Array<{ id: number; grand_total: number; sale_number: string; customer_name: string }>>`
      SELECT s.id, s.grand_total, s.sale_number, c.display_name AS customer_name
      FROM retail_sales s
      JOIN retail_customers c ON c.id = s.customer_id
      WHERE s.id = ${saleId}
      LIMIT 1
    `;
    if (!sale[0]) throw new NotFoundException('Sipariş bulunamadı.');

    // Mevcut PENDING talep varsa onu döndür
    const existing = await this.prisma.$queryRaw<Array<{ id: number; token: string; final_amount: number }>>`
      SELECT id, token, final_amount FROM eft_payment_requests
      WHERE sale_id = ${saleId} AND status = 'PENDING'
      LIMIT 1
    `;
    if (existing[0]) return this.formatRequest(existing[0]);

    const originalAmount = Number(sale[0].grand_total);
    const discountAmount = Math.round(originalAmount * EFT_DISCOUNT_RATE * 100) / 100;
    const finalAmount = Math.round((originalAmount - discountAmount) * 100) / 100;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EFT_EXPIRY_HOURS * 3600 * 1000);

    const rows = await this.prisma.$queryRaw<Array<{ id: number; token: string; final_amount: number }>>`
      INSERT INTO eft_payment_requests (
        sale_id, token, status, original_amount, discount_rate, discount_amount, final_amount,
        bank_name, iban, account_holder, expires_at, created_at, updated_at
      ) VALUES (
        ${saleId}, ${token}, 'PENDING', ${originalAmount}, ${EFT_DISCOUNT_RATE}, ${discountAmount}, ${finalAmount},
        ${BANK_INFO.bankName}, ${BANK_INFO.iban}, ${BANK_INFO.accountHolder}, ${expiresAt}, NOW(), NOW()
      ) RETURNING id, token, final_amount
    `;

    return {
      ...this.formatRequest(rows[0]),
      saleNumber: sale[0].sale_number,
      customerName: sale[0].customer_name,
      originalAmount,
      discountAmount,
      finalAmount,
      discountRate: EFT_DISCOUNT_RATE,
      bankName: BANK_INFO.bankName,
      iban: BANK_INFO.iban,
      accountHolder: BANK_INFO.accountHolder,
      expiresAt,
    };
  }

  // Müşteri linki için talep bilgisi (token ile)
  async getByToken(token: string) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT e.id, e.token, e.status, e.original_amount AS "originalAmount",
        e.discount_rate AS "discountRate", e.discount_amount AS "discountAmount",
        e.final_amount AS "finalAmount", e.bank_name AS "bankName", e.iban,
        e.account_holder AS "accountHolder", e.dekont_path AS "dekontPath",
        e.dekont_uploaded_at AS "dekontUploadedAt", e.customer_note AS "customerNote",
        e.expires_at AS "expiresAt", e.created_at AS "createdAt",
        s.sale_number AS "saleNumber", s.grand_total AS "grandTotal",
        c.display_name AS "customerName", c.phone
      FROM eft_payment_requests e
      JOIN retail_sales s ON s.id = e.sale_id
      JOIN retail_customers c ON c.id = s.customer_id
      WHERE e.token = ${token}
      LIMIT 1
    `;
    if (!rows[0]) throw new NotFoundException('EFT talebi bulunamadı.');
    const req = rows[0];
    if (req.status === 'EXPIRED' || (req.expiresAt && new Date(req.expiresAt as string) < new Date())) {
      if (req.status === 'PENDING') {
        await this.prisma.$executeRaw`UPDATE eft_payment_requests SET status='EXPIRED', updated_at=NOW() WHERE token=${token}`;
      }
      throw new BadRequestException('Bu EFT ödeme linki süresi dolmuş.');
    }
    return req;
  }

  // Müşteri dekont yükledi
  async uploadDekont(token: string, dekontPath: string, customerNote?: string) {
    const req = await this.prisma.$queryRaw<Array<{ id: number; status: string }>>`
      SELECT id, status FROM eft_payment_requests WHERE token = ${token} LIMIT 1
    `;
    if (!req[0]) throw new NotFoundException('EFT talebi bulunamadı.');
    if (req[0].status !== 'PENDING') throw new BadRequestException('Bu talep artık güncellenemez.');

    await this.prisma.$executeRaw`
      UPDATE eft_payment_requests
      SET dekont_path = ${dekontPath},
          dekont_uploaded_at = NOW(),
          customer_note = COALESCE(${customerNote ?? null}, customer_note),
          updated_at = NOW()
      WHERE token = ${token}
    `;
    return { ok: true, message: 'Dekontunuz alındı. En kısa sürede incelenecektir.' };
  }

  // Personel: bekleyen EFT listesi
  async listPending() {
    return this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT e.id, e.token, e.status, e.original_amount AS "originalAmount",
        e.discount_amount AS "discountAmount", e.final_amount AS "finalAmount",
        e.dekont_path AS "dekontPath", e.dekont_uploaded_at AS "dekontUploadedAt",
        e.customer_note AS "customerNote", e.staff_note AS "staffNote",
        e.expires_at AS "expiresAt", e.created_at AS "createdAt",
        s.id AS "saleId", s.sale_number AS "saleNumber", s.status AS "saleStatus",
        c.display_name AS "customerName", c.phone
      FROM eft_payment_requests e
      JOIN retail_sales s ON s.id = e.sale_id
      JOIN retail_customers c ON c.id = s.customer_id
      WHERE e.status IN ('PENDING')
      ORDER BY e.dekont_uploaded_at DESC NULLS LAST, e.created_at DESC
      LIMIT 100
    `;
  }

  // Personel: EFT onayla
  async confirm(id: number, userId: number, staffNote?: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: number; sale_id: number; final_amount: number; status: string }>>`
      SELECT id, sale_id, final_amount, status FROM eft_payment_requests WHERE id = ${id} LIMIT 1
    `;
    if (!rows[0]) throw new NotFoundException('EFT talebi bulunamadı.');
    if (rows[0].status !== 'PENDING') throw new BadRequestException('Bu talep zaten işlendi.');

    const saleId = rows[0].sale_id;
    const amount = Number(rows[0].final_amount);

    // EFT talebini onayla
    await this.prisma.$executeRaw`
      UPDATE eft_payment_requests
      SET status = 'CONFIRMED', confirmed_by_id = ${userId}, confirmed_at = NOW(),
          staff_note = ${staffNote ?? null}, updated_at = NOW()
      WHERE id = ${id}
    `;

    // Siparişe ödeme ekle (BANK_TRANSFER)
    const eventKey = `EFT_PAYMENT_${id}`;
    const existing = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM retail_sale_payments WHERE event_key = ${eventKey} LIMIT 1
    `;
    if (!existing[0]) {
      await this.prisma.$executeRaw`
        INSERT INTO retail_sale_payments (sale_id, method, amount, event_key, paid_at, note, created_at, created_by_id)
        VALUES (${saleId}, 'BANK_TRANSFER'::"RetailPaymentMethod", ${amount}, ${eventKey}, NOW(), 'EFT ödeme onaylandı (%3 indirimli)', NOW(), ${userId})
      `;
      // Sipariş toplamlarını güncelle
      await this.prisma.$executeRaw`
        UPDATE retail_sales
        SET paid_total = COALESCE((SELECT SUM(amount) FROM retail_sale_payments WHERE sale_id = ${saleId}), 0),
            remaining_total = grand_total - COALESCE((SELECT SUM(amount) FROM retail_sale_payments WHERE sale_id = ${saleId}), 0),
            status = CASE WHEN status IN ('PAYMENT_PENDING', 'DRAFT') THEN 'CONFIRMED' ELSE status END,
            updated_at = NOW()
        WHERE id = ${saleId}
      `;
    }

    return { ok: true, message: 'EFT ödeme onaylandı, sipariş hazırlanmaya alındı.' };
  }

  // Personel: EFT reddet
  async reject(id: number, userId: number, staffNote: string) {
    const rows = await this.prisma.$queryRaw<Array<{ status: string }>>`
      SELECT status FROM eft_payment_requests WHERE id = ${id} LIMIT 1
    `;
    if (!rows[0]) throw new NotFoundException('EFT talebi bulunamadı.');
    if (rows[0].status !== 'PENDING') throw new BadRequestException('Bu talep zaten işlendi.');

    await this.prisma.$executeRaw`
      UPDATE eft_payment_requests
      SET status = 'REJECTED', confirmed_by_id = ${userId}, confirmed_at = NOW(),
          staff_note = ${staffNote}, updated_at = NOW()
      WHERE id = ${id}
    `;
    return { ok: true, message: 'EFT talebi reddedildi.' };
  }

  // EFT link URL'si (frontend için)
  getLink(token: string): string {
    const base = process.env.FRONTEND_URL ?? 'https://erp.florayapaycicek.com';
    return `${base}/eft/${token}`;
  }

  private formatRequest(row: { id: number; token: string; final_amount: number }) {
    return { id: row.id, token: row.token, finalAmount: Number(row.final_amount) };
  }
}
