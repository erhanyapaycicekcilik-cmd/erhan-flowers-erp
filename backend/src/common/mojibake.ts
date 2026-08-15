const replacements = [
  ['\u00c3\u0152', 'Ü'],
  ['\u00c3\u0153', 'Ü'],
  ['\u00c3\u009c', 'Ü'],
  ['\u00c3\u00bc', 'ü'],
  ['\u00c3\u2013', 'Ö'],
  ['\u00c3\u2014', 'Ö'],
  ['\u00c3\u0096', 'Ö'],
  ['\u00c3\u00b6', 'ö'],
  ['\u00c3\u2021', 'Ç'],
  ['\u00c3\u2022', 'Ç'],
  ['\u00c3\u0087', 'Ç'],
  ['\u00c3\u00a7', 'ç'],
  ['\u00c4\u00b0', 'İ'],
  ['\u00c4\u00b1', 'ı'],
  ['\u00c4\u017d', 'Ğ'],
  ['\u00c4\u017e', 'Ğ'],
  ['\u00c4\u009e', 'Ğ'],
  ['\u00c4\u0178', 'ğ'],
  ['\u00c4\u009f', 'ğ'],
  ['\u00c5\u009e', 'Ş'],
  ['\u00c5\u017d', 'Ş'],
  ['\u00c5\u0178', 'ş'],
  ['\u00c5\u009f', 'ş'],
  ['\ufffd', 'ş'],
] as const;

export function cleanMojibakeText(value: string) {
  return replacements.reduce((text, [bad, good]) => text.split(bad).join(good), value);
}

export function cleanMojibakeDeep<T>(value: T): T {
  if (typeof value === 'string') return cleanMojibakeText(value) as T;
  if (Array.isArray(value)) return value.map((item) => cleanMojibakeDeep(item)) as T;
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cleanMojibakeDeep(item)]),
  ) as T;
}
