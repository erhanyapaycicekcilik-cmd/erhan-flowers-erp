/**
 * Banka SMS'lerinden kredi kartı ekstre / kredi taksit / limit bilgisi çıkarır. En iyi çaba —
 * bulunamayan alan null döner. Örnek metinler:
 *  "1234 ile biten kartinizin 15.11.2026 tarihli ekstresi kesildi. Donem borcu 12.345,67 TL, asgari odeme tutari 2.469,13 TL, son odeme tarihi 25.11.2026"
 *  "**1234 nolu kartinizla 250,00 TL harcama yapildi. Kullanilabilir limitiniz 37.654,33 TL"
 *  "12345678 nolu kredinizin 01.12.2026 vadeli 4.500,00 TL taksiti ..."
 */
import { foldTr, parseTrAmount } from '../bill-accounts/bill-email-parser';

export type ParsedBankSms = {
  /** Ekstre / dönem borcu veya kredi taksit tutarı */
  amount: number | null;
  minimumPayment: number | null;
  dueDate: Date | null;
  statementDate: Date | null;
  /** Kullanılabilir limit (harcama SMS'lerinde) */
  availableLimit: number | null;
  /** Güncel toplam borç (bazı bankalar yazar) */
  currentDebt: number | null;
  last4: string | null;
  bank: string | null;
  isStatement: boolean;
};

const NUM = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})|\d+(?:\.\d{1,2})?)`;
const CUR = String.raw`(?:tl|try|₺)`;

const BANKS: Array<[RegExp, string]> = [
  [/garanti|bonus/, 'Garanti BBVA'],
  [/yapi ?kredi|yapikredi|\bykb\b|\bworld\b/, 'Yapı Kredi'],
  [/akbank|axess|wings/, 'Akbank'],
  [/is ?bankasi|isbank|maximum/, 'İş Bankası'],
  [/ziraat|bankkart/, 'Ziraat Bankası'],
  [/halkbank|paraf/, 'Halkbank'],
  [/vakifbank|vakif/, 'VakıfBank'],
  [/\bqnb\b|finansbank|cardfinans/, 'QNB'],
  [/denizbank/, 'DenizBank'],
  [/\bteb\b/, 'TEB'],
  [/\bing\b/, 'ING'],
  [/enpara/, 'Enpara'],
  [/fibabanka/, 'Fibabanka'],
  [/sekerbank/, 'Şekerbank'],
  [/kuveyt ?turk/, 'Kuveyt Türk'],
  [/albaraka/, 'Albaraka'],
  [/odeabank/, 'Odeabank'],
  [/\bhsbc\b/, 'HSBC'],
];

export function detectBank(text: string): string | null {
  const f = foldTr(text);
  return BANKS.find(([re]) => re.test(f))?.[1] ?? null;
}

/** "25.11.2026" / "25/11/26" / "25.11" (yıl yoksa bugünden sonraki ilk tarih) / "25 Kasim 2026" */
const MONTHS = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
function parseDate(s: string, now = new Date()): Date | null {
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
    if (m[3]) return new Date(Date.UTC(Number(m[3].length === 2 ? `20${m[3]}` : m[3]), mo - 1, d));
    let y = now.getUTCFullYear();
    const cand = new Date(Date.UTC(y, mo - 1, d));
    if (cand.getTime() < now.getTime() - 60 * 86400000) y += 1; // Aralık'ta gelen "05.01" → gelecek yıl
    return new Date(Date.UTC(y, mo - 1, d));
  }
  m = s.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/);
  if (m) {
    const mi = MONTHS.findIndex((x) => m![2].startsWith(x));
    if (mi < 0) return null;
    return new Date(Date.UTC(m[3] ? Number(m[3]) : now.getUTCFullYear(), mi, Number(m[1])));
  }
  return null;
}

/** Anahtar ifadeden sonra gelen ilk tutar ("donem borcunuz: 1.234,56 TL") */
function amountAfter(f: string, keys: string[]): number | null {
  for (const key of keys) {
    const re = new RegExp(`${key}[a-z]*\\s*(?:tutari[a-z]*)?\\s*[:：]?\\s*${CUR}?\\s*${NUM}`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(f))) {
      const n = parseTrAmount(m[1]);
      if (n) return n;
    }
  }
  return null;
}

/** Anahtar ifadeden önce gelen tutar ("1.234,56 TL donem borcu") */
function amountBefore(f: string, keys: string[]): number | null {
  for (const key of keys) {
    const m = f.match(new RegExp(`${NUM}\\s*${CUR}\\s*(?:tutarindaki\\s*|olan\\s*|tutarli\\s*)?${key}`));
    if (m) {
      const n = parseTrAmount(m[1]);
      if (n) return n;
    }
  }
  return null;
}

function dateNear(f: string, keys: string[]): Date | null {
  for (const key of keys) {
    // ifade → tarih
    const re = new RegExp(`${key}[a-z]*\\s*[:：]?\\s*`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(f))) {
      const d = parseDate(f.slice(m.index + m[0].length, m.index + m[0].length + 20));
      if (d) return d;
    }
    // tarih → ifade ("25.11.2026 son odeme tarihli")
    const pm = f.match(new RegExp(`(\\d{1,2}[./-]\\d{1,2}(?:[./-]\\d{2,4})?)\\s*(?:tarihli\\s*|vadeli\\s*)?${key}`));
    if (pm) {
      const d = parseDate(pm[1]);
      if (d) return d;
    }
  }
  return null;
}

const STATEMENT_WORDS = /(ekstre|hesap ozeti|donem borc|asgari odeme|hesap kesim|kredi taksit|taksitiniz|taksit tutari|kredinizin|son odeme)/;

export function parseBankSms(text: string, from?: string | null): ParsedBankSms {
  const f = foldTr(text.replace(/\s+/g, ' '));

  const last4 =
    f.match(/(\d{4})\s*(?:ile|ıle)\s*biten/)?.[1] ??
    f.match(/(?:\*{2,}|x{2,}|\.{3,})\s*(\d{4})(?!\d)/)?.[1] ??
    f.match(/son (?:4|dort) hane(?:si)?\s*[:]?\s*(\d{4})/)?.[1] ??
    f.match(/(\d{6,16})\s*(?:nolu|no'lu|numarali|sayili)\s*(?:kredi|hesab|kart)/)?.[1] ??
    null;

  const isStatement = STATEMENT_WORDS.test(f);
  const amountKeys = ['donem borc', 'ekstre borc', 'ekstre tutar', 'hesap ozeti borc', 'hesap ozeti tutar', 'odenmesi gereken', 'toplam borc', 'taksit tutar', 'kredi taksit'];
  let amount = isStatement ? amountAfter(f, amountKeys) ?? amountBefore(f, ['donem borc', 'ekstre', 'hesap ozeti', 'taksit']) : null;
  const minimumPayment = amountAfter(f, ['asgari odeme', 'asgari tutar', 'min\\. odeme', 'minimum odeme']) ?? amountBefore(f, ['asgari']);
  const availableLimit = amountAfter(f, ['kullanilabilir limit', 'kullanilabilir bakiye', 'musait limit']);
  const currentDebt = amountAfter(f, ['guncel borc', 'toplam guncel borc', 'guncel toplam borc']);

  // Son çare: ekstre SMS'inde anahtar yoksa en büyük tutar dönem borcu
  if (isStatement && !amount) {
    const all = [...f.matchAll(new RegExp(`${NUM}\\s*${CUR}`, 'g'))].map((m) => parseTrAmount(m[1]) ?? 0).filter((n) => n > 0);
    if (all.length) amount = Math.max(...all);
  }

  return {
    amount,
    minimumPayment,
    dueDate: dateNear(f, ['son odeme', 'vade tarihi', 'vadeli', 'odeme tarihi']),
    statementDate: dateNear(f, ['hesap kesim', 'ekstre kesim', 'kesim tarihi', 'tarihli ekstre', 'tarihli hesap ozeti']),
    availableLimit,
    currentDebt,
    last4,
    bank: detectBank(`${from ?? ''} ${text}`),
    isStatement,
  };
}
