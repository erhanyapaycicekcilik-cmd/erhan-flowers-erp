import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)

  private transporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    })
  }

  async sendWebOrderConfirmation(order: {
    orderNumber: string
    customerName: string
    customerEmail: string
    grandTotal: number | string
    paymentMethod: string
    items: Array<{ productName: string; quantity: number | string; lineTotal: number | string }>
    address: string
    city: string
    note?: string | null
  }) {
    const smtpUser = process.env.SMTP_USER ?? ''
    if (!smtpUser || !order.customerEmail) return

    const paymentLabel =
      order.paymentMethod === 'EFT' ? 'EFT / Havale' :
      order.paymentMethod === 'ONLINE' ? 'Online Ödeme (Kart)' : 'WhatsApp'

    const itemRows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${i.productName}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${i.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${Number(i.lineTotal).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
          </tr>`,
      )
      .join('')

    const total = Number(order.grandTotal).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#2d7a3e;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">Erhan Flowers</h1>
      <p style="margin:4px 0 0;color:#a8d5b2;font-size:13px">erhanflowers.com</p>
    </div>
    <div style="padding:28px 32px">
      <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:18px">Siparişiniz alındı 🌸</h2>
      <p style="margin:0 0 20px;color:#555;font-size:14px">Merhaba <strong>${order.customerName}</strong>, siparişiniz başarıyla oluşturuldu.</p>

      <div style="background:#f9f9f9;border-radius:6px;padding:16px 20px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#888;font-size:13px">Sipariş No</span>
          <span style="color:#1a1a1a;font-weight:700;font-size:13px">${order.orderNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#888;font-size:13px">Ödeme Yöntemi</span>
          <span style="color:#1a1a1a;font-size:13px">${paymentLabel}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#888;font-size:13px">Teslimat Adresi</span>
          <span style="color:#1a1a1a;font-size:13px;text-align:right;max-width:280px">${order.address}, ${order.city}</span>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr style="background:#f0f0f0">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;font-weight:600">Ürün</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#666;font-weight:600">Adet</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#666;font-weight:600">Tutar</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px;text-align:right;font-weight:700;color:#1a1a1a">Toplam</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#2d7a3e;font-size:16px">${total}</td>
          </tr>
        </tfoot>
      </table>

      ${order.note ? `<div style="background:#fff8e1;border-left:3px solid #f5a623;padding:12px 16px;border-radius:4px;margin-bottom:20px;font-size:13px;color:#555">${order.note}</div>` : ''}

      <p style="font-size:13px;color:#555;margin:0 0 8px">Siparişiniz ekibimiz tarafından incelenip en kısa sürede hazırlanacaktır. Sorularınız için WhatsApp hattımızdan ulaşabilirsiniz.</p>
    </div>
    <div style="background:#f5f5f5;padding:16px 32px;text-align:center;font-size:12px;color:#999">
      © Erhan Flowers — erhanflowers.com
    </div>
  </div>
</body>
</html>`

    try {
      await this.transporter().sendMail({
        from: `"Erhan Flowers" <${smtpUser}>`,
        to: order.customerEmail,
        subject: `Siparişiniz alındı — ${order.orderNumber}`,
        html,
      })
      this.logger.log(`Onay maili gönderildi: ${order.customerEmail} (${order.orderNumber})`)
    } catch (err) {
      this.logger.error(`Mail gönderilemedi: ${order.customerEmail}`, err instanceof Error ? err.message : String(err))
    }
  }

  async sendOwnerOrderNotification(order: {
    orderNumber: string
    customerName: string
    customerPhone: string
    customerEmail?: string | null
    grandTotal: number | string
    paymentMethod: string
    items: Array<{ productName: string; quantity: number | string; lineTotal: number | string }>
    address: string
    district: string
    city: string
    note?: string | null
  }) {
    const smtpUser = process.env.SMTP_USER ?? ''
    const notifyEmail = process.env.NOTIFY_EMAIL ?? ''
    if (!smtpUser || !notifyEmail) return

    const paymentLabel =
      order.paymentMethod === 'EFT' ? 'EFT / Havale' :
      order.paymentMethod === 'ONLINE' ? 'Online Ödeme (Kart)' : 'WhatsApp'

    const itemRows = order.items
      .map((i) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${i.productName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${Number(i.lineTotal).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
      </tr>`)
      .join('')

    const total = Number(order.grandTotal).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })

    const html = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:#1a3a28;padding:20px 28px">
      <h2 style="margin:0;color:#fff;font-size:18px">🛍️ Yeni Sipariş — ${order.orderNumber}</h2>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px">
        <tr><td style="padding:5px 0;color:#666;width:140px">Müşteri</td><td style="font-weight:700">${order.customerName}</td></tr>
        <tr><td style="padding:5px 0;color:#666">Telefon</td><td><a href="tel:${order.customerPhone}" style="color:#2d7a3e">${order.customerPhone}</a></td></tr>
        ${order.customerEmail ? `<tr><td style="padding:5px 0;color:#666">E-posta</td><td>${order.customerEmail}</td></tr>` : ''}
        <tr><td style="padding:5px 0;color:#666">Ödeme</td><td>${paymentLabel}</td></tr>
        <tr><td style="padding:5px 0;color:#666">Adres</td><td>${order.address}, ${order.district} / ${order.city}</td></tr>
        ${order.note ? `<tr><td style="padding:5px 0;color:#666">Not</td><td style="color:#b45309">${order.note}</td></tr>` : ''}
      </table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
        <thead><tr style="background:#f0f0f0">
          <th style="padding:7px 10px;text-align:left;font-size:12px;color:#555">Ürün</th>
          <th style="padding:7px 10px;text-align:center;font-size:12px;color:#555">Adet</th>
          <th style="padding:7px 10px;text-align:right;font-size:12px;color:#555">Tutar</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:10px;text-align:right;font-weight:700">Toplam</td>
          <td style="padding:10px;text-align:right;font-weight:700;color:#2d7a3e;font-size:15px">${total}</td>
        </tr></tfoot>
      </table>
    </div>
    <div style="background:#f5f5f5;padding:12px 28px;text-align:center;font-size:12px;color:#999">erhanflowers.com · ERP Panel: erp.erhanflowers.com</div>
  </div>
</body>
</html>`

    try {
      await this.transporter().sendMail({
        from: `"Erhan Flowers" <${smtpUser}>`,
        to: notifyEmail,
        subject: `🛍️ Yeni sipariş — ${order.orderNumber} (${order.customerName})`,
        html,
      })
      this.logger.log(`Owner bildirim maili gönderildi: ${notifyEmail} (${order.orderNumber})`)
    } catch (err) {
      this.logger.error(`Owner bildirim maili gönderilemedi`, err instanceof Error ? err.message : String(err))
    }
  }
}
