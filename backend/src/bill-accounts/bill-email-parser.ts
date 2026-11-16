/**
 * Kurumların (elektrik, su, doğalgaz, telefon, internet) fatura e-postalarından
 * tutar / son ödeme tarihi / fatura numarası çıkarır. En iyi çaba — bulunamayan alan null döner.
 */

const FOLD: Record<string, string> = {
  'İ': 'i', I: 'i', 'ı': 'i', 'Ş': 's', 'ş': 's', 'Ğ': 'g', 'ğ': 'g', 'Ü': 'u', 'ü': 'u', 'Ö': 'o', 'ö': 'o', 'Ç': 'c', 'ç': 'c',
};

/** Karakter karakter ASCII küçük harfe indirger (uzunluk korunur → indeksler orijinal metinle aynı). */
export function foldTr(s: string) {
  let out = '';
  for (const ch of s) {
    const f = FOLD[ch] ?? ch.toLowerCase();
    out += f.length === ch.length ? f : ch;
  }
  return out;
}

/** "1.234,56" / "1234,56" / "1234.56" / "1.234" → sayı */
export function parseTrAmount(raw: string): number | null {
  let s = raw.trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

const MONTHS = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];

function parseDateToken(folded: string): Date | null {
  let m = folded.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    const y = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    const d = new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1])));
    return isNaN(d.getTime()) ? null : d;
  }
  m = folded.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (m) {
    const mi = MONTHS.findIndex((x) => m![2].startsWith(x));
    if (mi >= 0) return new Date(Date.UTC(Number(m[3]), mi, Number(m[1])));
  }
  return null;
}

const AMOUNT = String.raw`(?:tl|try|₺)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)\s*(?:tl|try|₺)?`;

// Öncelik sırasıyla: en spesifik ifade önce
const AMOUNT_KEYS = [
  'odenecek tutar', 'odenmesi gereken tutar', 'son odenecek tutar', 'fatura tutari', 'toplam fatura tutari',
  'odenecek toplam tutar', 'genel toplam', 'toplam tutar', 'borc tutari', 'tutar',
];

export type ParsedBill = { amount: number | null; dueDate: Date | null; invoiceNo: string | null };

export function parseBillEmail(text: string): ParsedBill {
  const original = text.replace(/\s+/g, ' ');
  const f = foldTr(original);

  let amount: number | null = null;
  for (const key of AMOUNT_KEYS) {
    const re = new RegExp(`${key}\\s*(?:\\([^)]{0,20}\\))?\\s*[:：]?\\s*${AMOUNT}`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(f))) {
      const n = parseTrAmount(m[1]);
      if (n) { amount = n; break; }
    }
    if (amount) break;
  }
  // "toplam 2130.00 TL" / "1.540,25 TL tutarındaki" (CK Enerji borç bildirimi vb.) — para birimi şart
  const NUM = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;
  if (!amount) {
    const m = f.match(new RegExp(`toplam\\s*[:：]?\\s*${NUM}\\s*(?:tl|try|₺)`)) ?? f.match(new RegExp(`${NUM}\\s*(?:tl|try|₺)\\s*tutarinda`));
    if (m) amount = parseTrAmount(m[1]);
  }
  if (!amount) {
    const m = f.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})\s*(?:tl|₺)/);
    if (m) amount = parseTrAmount(m[1]);
  }

  let dueDate: Date | null = null;
  const dm = /son odeme(?: tarihi)?\s*[:：]?\s*/g.exec(f);
  if (dm) dueDate = parseDateToken(f.slice(dm.index + dm[0].length, dm.index + dm[0].length + 25));

  let invoiceNo: string | null = null;
  const im = /fatura (?:no|numarasi|seri ?no|seri ?sira ?no)\s*[:：]?\s*/g.exec(f);
  if (im) {
    const start = im.index + im[0].length;
    const tok = original.slice(start, start + 40).match(/^[A-Za-z0-9][A-Za-z0-9\-/]{4,}/);
    if (tok) invoiceNo = tok[0];
  }

  return { amount, dueDate, invoiceNo };
}
