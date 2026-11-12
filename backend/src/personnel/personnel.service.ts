import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

/** Dosyalar /uploads altında ama nokta ile başlayan klasörde: statik servis bunları vermez, sadece yetkili uçtan okunur. */
export const PERSONNEL_DIR = join(process.cwd(), 'uploads', '.personel');
export function ensurePersonnelDir() {
  mkdirSync(PERSONNEL_DIR, { recursive: true });
  return PERSONNEL_DIR;
}

export const ATTENDANCE_TYPES: Record<string, { label: string; unit: 'DAY' | 'TIMES' }> = {
  ABSENT: { label: 'Gelmedi', unit: 'DAY' },
  ANNUAL_LEAVE: { label: 'Yıllık İzin', unit: 'DAY' },
  EXCUSE_LEAVE: { label: 'Mazeret İzni', unit: 'DAY' },
  UNPAID_LEAVE: { label: 'Ücretsiz İzin', unit: 'DAY' },
  SICK_REPORT: { label: 'Rapor', unit: 'DAY' },
  EARLY_LEAVE: { label: 'Erken Çıkış', unit: 'TIMES' },
  LATE: { label: 'Geç Geldi', unit: 'TIMES' },
};

const EMPLOYEE_FIELDS = [
  'fullName', 'nationalId', 'birthDate', 'gender', 'bloodType', 'phone', 'email', 'address', 'position', 'department',
  'hireDate', 'terminationDate', 'terminationReason', 'sgkNumber', 'iban', 'netSalary', 'emergencyName', 'emergencyPhone', 'notes',
] as const;

type Row = Record<string, unknown>;

@Injectable()
export class PersonnelService {
  constructor(private readonly prisma: PrismaService) {}

  private text(v: unknown) {
    return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
  }

  private date(v: unknown, label: string, required = false): string | null {
    const t = this.text(v);
    if (!t) {
      if (required) throw new BadRequestException(`${label} zorunlu.`);
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(new Date(t).getTime())) throw new BadRequestException(`${label} geçersiz (YYYY-AA-GG).`);
    return t;
  }

  private selectEmployee = `
    e.id, e.full_name AS "fullName", e.national_id AS "nationalId", to_char(e.birth_date, 'YYYY-MM-DD') AS "birthDate",
    e.gender, e.blood_type AS "bloodType", e.phone, e.email, e.address, e.position, e.department,
    to_char(e.hire_date, 'YYYY-MM-DD') AS "hireDate", to_char(e.termination_date, 'YYYY-MM-DD') AS "terminationDate",
    e.termination_reason AS "terminationReason", e.sgk_number AS "sgkNumber", e.iban, e.net_salary::float AS "netSalary",
    e.emergency_name AS "emergencyName", e.emergency_phone AS "emergencyPhone", e.notes,
    (e.photo_path IS NOT NULL) AS "hasPhoto", e.updated_at AS "updatedAt",
    CASE WHEN e.termination_date IS NOT NULL AND e.termination_date <= CURRENT_DATE THEN 'LEFT' ELSE 'ACTIVE' END AS status`;

  async list(query: { status?: string; q?: string; year?: string }) {
    const status = ['ACTIVE', 'LEFT'].includes(String(query.status)) ? String(query.status) : 'ALL';
    const q = this.text(query.q);
    const year = Number(query.year) || new Date().getFullYear();
    const rows = await this.prisma.$queryRawUnsafe<Row[]>(`
      SELECT ${this.selectEmployee},
        COALESCE(SUM(CASE WHEN a.type = 'ABSENT' THEN a.end_date - a.start_date + 1 END), 0)::int AS "absentDays",
        COALESCE(SUM(CASE WHEN a.type IN ('ANNUAL_LEAVE','EXCUSE_LEAVE','UNPAID_LEAVE','SICK_REPORT') THEN a.end_date - a.start_date + 1 END), 0)::int AS "leaveDays",
        COUNT(*) FILTER (WHERE a.type = 'EARLY_LEAVE')::int AS "earlyLeaves",
        COUNT(*) FILTER (WHERE a.type = 'LATE')::int AS "lates"
      FROM employees e
      LEFT JOIN employee_attendance a ON a.employee_id = e.id AND EXTRACT(YEAR FROM a.start_date) = $1
      WHERE ($2 = '' OR e.full_name ILIKE '%' || $2 || '%' OR e.phone ILIKE '%' || $2 || '%' OR e.position ILIKE '%' || $2 || '%')
      GROUP BY e.id
      HAVING $3 = 'ALL' OR (CASE WHEN e.termination_date IS NOT NULL AND e.termination_date <= CURRENT_DATE THEN 'LEFT' ELSE 'ACTIVE' END) = $3
      ORDER BY (e.termination_date IS NOT NULL AND e.termination_date <= CURRENT_DATE), e.full_name
    `, year, q, status);
    return { year, rows };
  }

  async get(id: number) {
    const rows = await this.prisma.$queryRawUnsafe<Row[]>(`SELECT ${this.selectEmployee} FROM employees e WHERE e.id = $1`, id);
    if (!rows[0]) throw new NotFoundException('Personel bulunamadı.');
    const attendance = await this.prisma.$queryRaw<Row[]>`
      SELECT a.id, a.type, to_char(a.start_date, 'YYYY-MM-DD') AS "startDate", to_char(a.end_date, 'YYYY-MM-DD') AS "endDate",
        (a.end_date - a.start_date + 1)::int AS days, a.time, a.note, a.created_at AS "createdAt", u.name AS "createdBy"
      FROM employee_attendance a LEFT JOIN users u ON u.id = a.created_by_id
      WHERE a.employee_id = ${id} ORDER BY a.start_date DESC, a.id DESC
    `;
    const documents = await this.prisma.$queryRaw<Row[]>`
      SELECT id, title, original_name AS "originalName", mime_type AS "mimeType", created_at AS "createdAt"
      FROM employee_documents WHERE employee_id = ${id} ORDER BY created_at DESC
    `;
    return { ...rows[0], attendance, documents, attendanceTypes: ATTENDANCE_TYPES };
  }

  private payload(body: Row, partial: boolean) {
    const data: Record<string, unknown> = {};
    for (const f of EMPLOYEE_FIELDS) {
      if (partial && !(f in body)) continue;
      const raw = body[f];
      if (f === 'birthDate') data[f] = this.date(raw, 'Doğum tarihi');
      else if (f === 'hireDate') data[f] = this.date(raw, 'İşe giriş tarihi', true);
      else if (f === 'terminationDate') data[f] = this.date(raw, 'İşten çıkış tarihi');
      else if (f === 'netSalary') {
        const t = this.text(raw).replace(',', '.');
        data[f] = t ? Number(t) : null;
        if (t && !Number.isFinite(data[f] as number)) throw new BadRequestException('Maaş geçersiz.');
      } else data[f] = this.text(raw) || null;
    }
    if ('fullName' in data && !data.fullName) throw new BadRequestException('Ad soyad zorunlu.');
    if (data.nationalId && !/^\d{11}$/.test(String(data.nationalId))) throw new BadRequestException('TC kimlik no 11 haneli olmalı.');
    if (data.hireDate && data.terminationDate && String(data.terminationDate) < String(data.hireDate)) {
      throw new BadRequestException('İşten çıkış tarihi işe giriş tarihinden önce olamaz.');
    }
    return data;
  }

  async create(body: Row, userId: number) {
    const d = this.payload(body ?? {}, false);
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      INSERT INTO employees (full_name, national_id, birth_date, gender, blood_type, phone, email, address, position, department,
        hire_date, termination_date, termination_reason, sgk_number, iban, net_salary, emergency_name, emergency_phone, notes, created_by_id)
      VALUES (${d.fullName}, ${d.nationalId}, ${d.birthDate}::date, ${d.gender}, ${d.bloodType}, ${d.phone}, ${d.email}, ${d.address},
        ${d.position}, ${d.department}, ${d.hireDate}::date, ${d.terminationDate}::date, ${d.terminationReason}, ${d.sgkNumber},
        ${d.iban}, ${d.netSalary}::numeric, ${d.emergencyName}, ${d.emergencyPhone}, ${d.notes}, ${userId})
      RETURNING id
    `;
    return this.get(rows[0].id);
  }

  async update(id: number, body: Row) {
    await this.get(id);
    const current = (await this.prisma.$queryRaw<Row[]>`SELECT to_char(hire_date, 'YYYY-MM-DD') AS h FROM employees WHERE id = ${id}`)[0];
    const d = this.payload({ hireDate: current.h, ...(body ?? {}) }, true);
    const columns: Record<string, string> = {
      fullName: 'full_name', nationalId: 'national_id', birthDate: 'birth_date', gender: 'gender', bloodType: 'blood_type',
      phone: 'phone', email: 'email', address: 'address', position: 'position', department: 'department', hireDate: 'hire_date',
      terminationDate: 'termination_date', terminationReason: 'termination_reason', sgkNumber: 'sgk_number', iban: 'iban',
      netSalary: 'net_salary', emergencyName: 'emergency_name', emergencyPhone: 'emergency_phone', notes: 'notes',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(d)) {
      values.push(value);
      const cast = ['birthDate', 'hireDate', 'terminationDate'].includes(key) ? '::date' : key === 'netSalary' ? '::numeric' : '';
      sets.push(`${columns[key]} = $${values.length}${cast}`);
    }
    if (sets.length) {
      values.push(id);
      await this.prisma.$executeRawUnsafe(`UPDATE employees SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`, ...values);
    }
    return this.get(id);
  }

  async remove(id: number) {
    const files = await this.prisma.$queryRaw<Array<{ p: string | null }>>`
      SELECT photo_path AS p FROM employees WHERE id = ${id}
      UNION ALL SELECT file_path FROM employee_documents WHERE employee_id = ${id}
    `;
    await this.prisma.$executeRaw`DELETE FROM employees WHERE id = ${id}`;
    files.forEach((f) => this.deleteFile(f.p));
    return { deleted: true };
  }

  private deleteFile(name: string | null | undefined) {
    if (!name) return;
    const path = join(PERSONNEL_DIR, name);
    try { if (existsSync(path)) unlinkSync(path); } catch { /* yoksay */ }
  }

  async setPhoto(id: number, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fotoğraf gelmedi.');
    const old = await this.prisma.$queryRaw<Array<{ p: string | null }>>`SELECT photo_path AS p FROM employees WHERE id = ${id}`;
    if (!old[0]) { this.deleteFile(file.filename); throw new NotFoundException('Personel bulunamadı.'); }
    await this.prisma.$executeRaw`UPDATE employees SET photo_path = ${file.filename}, updated_at = NOW() WHERE id = ${id}`;
    this.deleteFile(old[0].p);
    return { ok: true };
  }

  async photoPath(id: number) {
    const rows = await this.prisma.$queryRaw<Array<{ p: string | null }>>`SELECT photo_path AS p FROM employees WHERE id = ${id}`;
    const p = rows[0]?.p ? join(PERSONNEL_DIR, rows[0].p) : null;
    if (!p || !existsSync(p)) throw new NotFoundException('Fotoğraf yok.');
    return p;
  }

  async addAttendance(id: number, body: Row, userId: number) {
    await this.get(id);
    const type = this.text(body?.type);
    const def = ATTENDANCE_TYPES[type];
    if (!def) throw new BadRequestException('Kayıt türü geçersiz.');
    const start = this.date(body.startDate, 'Tarih', true)!;
    const end = def.unit === 'DAY' ? this.date(body.endDate, 'Bitiş tarihi') ?? start : start;
    if (end < start) throw new BadRequestException('Bitiş tarihi başlangıçtan önce olamaz.');
    const time = this.text(body.time) || null;
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new BadRequestException('Saat SS:DD biçiminde olmalı.');
    await this.prisma.$executeRaw`
      INSERT INTO employee_attendance (employee_id, type, start_date, end_date, time, note, created_by_id)
      VALUES (${id}, ${type}, ${start}::date, ${end}::date, ${time}, ${this.text(body.note) || null}, ${userId})
    `;
    return this.get(id);
  }

  async deleteAttendance(attendanceId: number) {
    await this.prisma.$executeRaw`DELETE FROM employee_attendance WHERE id = ${attendanceId}`;
    return { deleted: true };
  }

  async addDocument(id: number, file: Express.Multer.File | undefined, title: string, userId: number) {
    if (!file) throw new BadRequestException('Dosya gelmedi.');
    const exists = await this.prisma.$queryRaw<Row[]>`SELECT id FROM employees WHERE id = ${id}`;
    if (!exists[0]) { this.deleteFile(file.filename); throw new NotFoundException('Personel bulunamadı.'); }
    const cleanTitle = this.text(title) || Buffer.from(file.originalname, 'latin1').toString('utf8');
    await this.prisma.$executeRaw`
      INSERT INTO employee_documents (employee_id, title, file_path, original_name, mime_type, created_by_id)
      VALUES (${id}, ${cleanTitle}, ${file.filename}, ${Buffer.from(file.originalname, 'latin1').toString('utf8')}, ${file.mimetype}, ${userId})
    `;
    return this.get(id);
  }

  async documentFile(docId: number) {
    const rows = await this.prisma.$queryRaw<Array<{ p: string; name: string | null; mime: string | null }>>`
      SELECT file_path AS p, original_name AS name, mime_type AS mime FROM employee_documents WHERE id = ${docId}
    `;
    const p = rows[0] ? join(PERSONNEL_DIR, rows[0].p) : null;
    if (!p || !existsSync(p)) throw new NotFoundException('Belge bulunamadı.');
    return { path: p, name: rows[0].name ?? 'belge', mime: rows[0].mime ?? 'application/octet-stream' };
  }

  async deleteDocument(docId: number) {
    const rows = await this.prisma.$queryRaw<Array<{ p: string }>>`DELETE FROM employee_documents WHERE id = ${docId} RETURNING file_path AS p`;
    this.deleteFile(rows[0]?.p);
    return { deleted: true };
  }
}
