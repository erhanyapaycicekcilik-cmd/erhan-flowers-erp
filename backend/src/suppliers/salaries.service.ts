import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PAYDAY_KEY = 'salary_payday';
/** Takip başlangıcı: bu tarihten önce vadesi gelmiş maaşlar "gecikmiş" sayılmaz (sistem 17.11.2026'da kuruldu) */
const TRACKING_START = new Date('2026-11-17T00:00:00+03:00');

type Employee = { id: number; fullName: string; position: string | null; netSalary: number | null; iban: string | null; hireDate: string; terminationDate: string | null };

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class SalariesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayday() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: PAYDAY_KEY } });
    const n = Number(row?.value);
    return n >= 1 && n <= 31 ? n : 1;
  }

  async setPayday(day: number) {
    const d = Math.floor(Number(day));
    if (!(d >= 1 && d <= 31)) throw new BadRequestException('Maaş günü 1-31 arası olmalı.');
    await this.prisma.appSetting.upsert({ where: { key: PAYDAY_KEY }, create: { key: PAYDAY_KEY, value: String(d) }, update: { value: String(d) } });
    return { payday: d };
  }

  private dueDate(year: number, month: number, payday: number) {
    const last = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, Math.min(payday, last));
  }

  /** O ay çalışan (işe girmiş, çıkmamış) personel */
  private async employeesForMonth(year: number, month: number): Promise<Employee[]> {
    const first = `${year}-${String(month).padStart(2, '0')}-01`;
    return this.prisma.$queryRaw<Employee[]>`
      SELECT e.id, e.full_name AS "fullName", e.position, e.net_salary::float AS "netSalary", e.iban,
             to_char(e.hire_date, 'YYYY-MM-DD') AS "hireDate", to_char(e.termination_date, 'YYYY-MM-DD') AS "terminationDate"
      FROM employees e
      WHERE e.hire_date <= (${first}::date + INTERVAL '1 month' - INTERVAL '1 day')
        AND (e.termination_date IS NULL OR e.termination_date >= ${first}::date)
      ORDER BY e.full_name
    `;
  }

  /** Bir ayın maaş tablosu: net maaş − o ayki avanslar = ödenecek */
  async month(year: number, month: number) {
    if (!(year > 2000 && month >= 1 && month <= 12)) throw new BadRequestException('Geçersiz ay.');
    const payday = await this.getPayday();
    const first = `${year}-${String(month).padStart(2, '0')}-01`;
    const [emps, payments, advances] = await Promise.all([
      this.employeesForMonth(year, month),
      this.prisma.$queryRaw<Array<{ employeeId: number; amount: number | null; paidAt: Date | null; note: string | null }>>`
        SELECT employee_id AS "employeeId", amount::float AS amount, paid_at AS "paidAt", note
        FROM salary_payments WHERE year = ${year} AND month = ${month}
      `,
      this.prisma.$queryRaw<Array<{ id: number; employeeId: number; date: string; amount: number; note: string | null }>>`
        SELECT id, employee_id AS "employeeId", to_char(advance_date, 'YYYY-MM-DD') AS date, amount::float AS amount, note
        FROM salary_advances
        WHERE advance_date >= ${first}::date AND advance_date < (${first}::date + INTERVAL '1 month')
        ORDER BY advance_date
      `,
    ]);
    const due = this.dueDate(year, month, payday);
    const rows = emps.map((e) => {
      const adv = advances.filter((a) => a.employeeId === e.id);
      const advTotal = r2(adv.reduce((s, a) => s + a.amount, 0));
      const net = e.netSalary ?? 0;
      const pay = payments.find((p) => p.employeeId === e.id);
      return {
        employeeId: e.id,
        fullName: e.fullName,
        position: e.position,
        iban: e.iban,
        netSalary: net,
        advances: adv,
        advanceTotal: advTotal,
        payable: r2(Math.max(net - advTotal, 0)),
        paidAt: pay?.paidAt ?? null,
        paidAmount: pay?.amount ?? null,
        note: pay?.note ?? null,
      };
    });
    const unpaid = rows.filter((r) => !r.paidAt);
    return {
      year, month, payday,
      dueDate: due.toISOString(),
      rows,
      totals: {
        net: r2(rows.reduce((s, r) => s + r.netSalary, 0)),
        advances: r2(rows.reduce((s, r) => s + r.advanceTotal, 0)),
        payable: r2(unpaid.reduce((s, r) => s + r.payable, 0)),
        paid: r2(rows.filter((r) => r.paidAt).reduce((s, r) => s + (r.paidAmount ?? r.payable), 0)),
      },
    };
  }

  async pay(employeeId: number, year: number, month: number, amount?: number | null, note?: string | null) {
    const m = await this.month(year, month);
    const row = m.rows.find((r) => r.employeeId === employeeId);
    if (!row) throw new BadRequestException('Bu ay için personel bulunamadı.');
    const value = amount != null && Number(amount) > 0 ? Number(amount) : row.payable;
    await this.prisma.$executeRaw`
      INSERT INTO salary_payments (employee_id, year, month, amount, paid_at, note)
      VALUES (${employeeId}, ${year}, ${month}, ${value}, NOW(), ${note ?? null})
      ON CONFLICT (employee_id, year, month) DO UPDATE SET amount = ${value}, paid_at = NOW(), note = COALESCE(${note ?? null}, salary_payments.note)
    `;
    return this.month(year, month);
  }

  async unpay(employeeId: number, year: number, month: number) {
    await this.prisma.$executeRaw`UPDATE salary_payments SET paid_at = NULL WHERE employee_id = ${employeeId} AND year = ${year} AND month = ${month}`;
    return this.month(year, month);
  }

  async addAdvance(body: { employeeId: number; date: string; amount: number; note?: string }) {
    const amount = Number(body.amount);
    if (!body.employeeId) throw new BadRequestException('Personel seçilmeli.');
    if (!(amount > 0)) throw new BadRequestException('Avans tutarı 0\'dan büyük olmalı.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? ''))) throw new BadRequestException('Tarih geçersiz.');
    await this.prisma.$executeRaw`
      INSERT INTO salary_advances (employee_id, advance_date, amount, note)
      VALUES (${Number(body.employeeId)}, ${body.date}::date, ${amount}, ${body.note?.trim() || null})
    `;
    return { ok: true };
  }

  async deleteAdvance(id: number) {
    await this.prisma.$executeRaw`DELETE FROM salary_advances WHERE id = ${id}`;
    return { deleted: true };
  }

  /** Borç özeti / uyarılar için: ödenmemiş maaşlar (önceki, bu ve sonraki ay; takip başlangıcından sonra vadesi gelenler) */
  async unpaidForOverview(horizon: Date) {
    const today = new Date();
    const out: Array<{ employeeId: number; fullName: string; dueDate: Date; amount: number; year: number; month: number }> = [];
    for (let k = -1; k <= 1; k++) {
      const d = new Date(today.getFullYear(), today.getMonth() + k, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const sheet = await this.month(y, m);
      const due = new Date(sheet.dueDate);
      if (due < TRACKING_START || due > horizon) continue;
      for (const r of sheet.rows) {
        if (r.paidAt || r.payable <= 0) continue;
        out.push({ employeeId: r.employeeId, fullName: r.fullName, dueDate: due, amount: r.payable, year: y, month: m });
      }
    }
    return out;
  }
}
