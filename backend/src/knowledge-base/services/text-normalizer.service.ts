import { Injectable } from '@nestjs/common';

@Injectable()
export class TextNormalizerService {
  normalize(value: string) {
    return this.normalizeForSearch(value)
      .replace(/\b(\d{1,3})\s*(cm|santimetre)\b/g, '$1 cm')
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizeForSearch(value: string) {
    return String(value ?? '')
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/s\?yah/g, 'siyah')
      .replace(/g\?m(?:\?s|\?\?)/g, 'gumus')
      .replace(/g\?vde/g, 'govde')
      .replace(/yapra\?\?/g, 'yapragi')
      .replace(/a\?(?:ac|a\?)/g, 'agac')
      .replace(/dall\?/g, 'dalli')
      .replace(/g\?vdeli/g, 'govdeli')
      .replace(/saks\?/g, 'saksi')
      .replace(/plast\?k/g, 'plastik')
      .replace(/l\?lyum/g, 'lilyum')
      .replace(/nerg\?z/g, 'nergiz')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractHeightCm(value: string) {
    const normalized = this.normalize(value);
    const match = normalized.match(/\b(\d{1,3})\s*cm\b/);
    if (!match) return null;
    const height = Number(match[1]);
    if (!Number.isFinite(height) || height <= 0) return null;
    return height;
  }

  extractStemCount(value: string) {
    const normalized = this.normalize(value);
    const match = normalized.match(/\b(\d{1,2})\s*(dalli|govdeli|cubuklu|bambu)\b/);
    if (!match) return null;
    const count = Number(match[1]);
    return Number.isFinite(count) && count > 0 ? count : null;
  }

  includesWholeTerm(source: string, term: string) {
    const normalizedSource = ` ${this.normalize(source)} `;
    const normalizedTerm = ` ${this.normalize(term)} `;
    return normalizedSource.includes(normalizedTerm);
  }
}
