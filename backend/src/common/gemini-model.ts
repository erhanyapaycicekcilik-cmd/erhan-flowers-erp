/** Güncel varsayılan Gemini modeli. */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/** Google'ın kapattığı modeller (gemini-1.x, gemini-2.0-*) */
const RETIRED_GEMINI_MODEL = /^(models\/)?gemini-(1\.|2\.0)/i;

/**
 * .env'deki model adını güncel modele çevirir. Sunucu .env'inde hâlâ
 * GEMINI_MODEL="gemini-2.0-flash" yazıyor olsa bile çalışan modele geçilir.
 */
export function resolveGeminiModel(...configured: Array<string | undefined | null>) {
  for (const value of configured) {
    const model = value?.trim();
    if (model && !RETIRED_GEMINI_MODEL.test(model)) return model;
  }
  return DEFAULT_GEMINI_MODEL;
}

/** Sırayla denenecek modeller: ayarlı (geçerliyse) → 2.5 flash → 2.5 flash-lite. */
export function geminiModelCandidates(...configured: Array<string | undefined | null>) {
  return [...new Set([resolveGeminiModel(...configured), DEFAULT_GEMINI_MODEL, 'gemini-2.5-flash-lite'])];
}
