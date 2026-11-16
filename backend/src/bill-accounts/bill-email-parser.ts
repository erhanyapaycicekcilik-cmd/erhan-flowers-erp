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
    const m = f.match(new RegExp(`toplam\\s*[:：]?\\s*${NUM}\\s*(?:tl|try|₺)`)) ?? f.match(new RegExp(`${NUM}\\s*(?:tl|try|₺)\\s*tutar(?:inda|li)`));
    if (m) amount = parseTrAmount(m[1]);
  }
  if (!amount) {
    const m = f.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})\s*(?:tl|₺)/);
    if (m) amount = parseTrAmount(m[1]);
  }

  let dueDate: Date | null = null;
  // "Son Ödeme Tarihi: 25.11.2026" — tarih ifadeden sonra
  const dre = /son odeme(?: tarihi)?\s*[:：]?\s*/g;
  let dm: RegExpExecArray | null;
  while (!dueDate && (dm = dre.exec(f))) {
    dueDate = parseDateToken(f.slice(dm.index + dm[0].length, dm.index + dm[0].length + 25));
  }
  // "12.10.2026 son ödeme tarihli" (ASAT SMS) — tarih ifadeden önce
  if (!dueDate) {
    const pm = f.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s*(?:tarihli\s*)?son odeme(?: tarihli| tarihi)/);
    if (pm) dueDate = parseDateToken(pm[1]);
  }

  let invoiceNo: string | null = null;
  const im = /fatura (?:no|numarasi|seri ?no|seri ?sira ?no)\s*[:：]?\s*/g.exec(f);
  if (im) {
    const start = im.index + im[0].length;
    const tok = original.slice(start, start + 40).match(/^[A-Za-z0-9][A-Za-z0-9\-/]{4,}/);
    if (tok) invoiceNo = tok[0];
  }

  return { amount, dueDate, invoiceNo };
}

// ─── SMS sınıflandırma ───────────────────────────────────────────────────────

const BILL_WORDS = /(fatura|son odeme|abone|sozlesme|soz\. ?no|tesisat|hesabiniza ait|borc|odenmemis|odenmedig|donem)/;
const NOT_BILL_WORDS = /(kartiniz|kartinizla|harcama|dogrulama|sifre|sifreniz|kodu|kodunuz|otp|kampanya|takip numara|kargo|teslim)/;

/** SMS fatura/borç bildirimi gibi mi? (banka harcaması, doğrulama kodu, kargo vb. hariç) */
export function isBillLikeSms(text: string) {
  const f = foldTr(text);
  return BILL_WORDS.test(f) && !NOT_BILL_WORDS.test(f) && /\d/.test(f);
}

/** SMS'teki abone/sözleşme/hesap numarası adayı. */
export function extractSubscriberNo(text: string): string | null {
  const f = foldTr(text);
  // Hat numarası (Vodafone vb.): "0532 123 45 67" / "+90 532 1234567" / "5321234567 numarali hattiniz"
  const phone = f.match(/(?:\+?90\s?)?0?(5\d{2})\s?(\d{3})\s?(\d{2})\s?(\d{2})(?!\d)/);
  if (phone && /(hat|gsm|numarali|nolu|vodafone|turkcell)/.test(f)) return `${phone[1]}${phone[2]}${phone[3]}${phone[4]}`;
  const m =
    f.match(/(?:soz\.? ?no\.?|(?:sozlesme|abone|tesisat|hesap|hizmet|musteri) (?:no|numarasi))\s*[.:]?\s*(\d{6,14})/) ??
    f.match(/(\d{6,14})\s*(?:hizmet|abone|tesisat|sozlesme|hesap|musteri)?\s*(?:nolu|no'lu|no lu|numarali|sayili)/);
  return m ? m[1] : null;
}

/** Gönderen + metinden fatura türü ve kurum tahmini. */
const KNOWN_SENDERS: Record<string, { type: string; provider: string }> = {
  '2728': { type: 'WATER', provider: 'ASAT' },
  '252533649': { type: 'ELECTRICITY', provider: 'CK Akdeniz' },
};

export function guessBillType(text: string, from?: string | null): { type: string; provider: string | null } {
  const sender = (from ?? '').replace(/\D/g, '');
  if (sender && KNOWN_SENDERS[sender]) return KNOWN_SENDERS[sender];
  const f = foldTr(`${from ?? ''} ${text}`);
  if (/ck ?akdeniz|ck ?enerji|ckakdeniz|enerjisa|elektrik|\baydem\b|\bgediz\b|uludag elektrik|osmangazi elektrik/.test(f)) return { type: 'ELECTRICITY', provider: /ck ?akdeniz|ckakdeniz|ck ?enerji/.test(f) ? 'CK Akdeniz' : /enerjisa/.test(f) ? 'Enerjisa' : null };
  if (/\basat\b|su kesinti|su fatura|\biski\b|\baski\b|\bbuski\b|\bizsu\b|su ve kanalizasyon/.test(f)) return { type: 'WATER', provider: /\basat\b/.test(f) ? 'ASAT' : null };
  if (/dogalgaz|\bigdas\b|antalyagaz|baskentgaz|izmirgaz/.test(f)) return { type: 'NATURAL_GAS', provider: null };
  if (/superonline|turknet|turk ?telekom|\bttnet\b|fiber|internet|millenicom/.test(f)) return { type: 'INTERNET', provider: /turk ?telekom|ttnet/.test(f) ? 'Türk Telekom' : /superonline/.test(f) ? 'Superonline' : /turknet/.test(f) ? 'TurkNet' : null };
  if (/turkcell|vodafone|hattiniz|hat fatura/.test(f)) return { type: 'MOBILE', provider: /turkcell/.test(f) ? 'Turkcell' : /vodafone/.test(f) ? 'Vodafone' : null };
  return { type: 'OTHER', provider: null };
}
