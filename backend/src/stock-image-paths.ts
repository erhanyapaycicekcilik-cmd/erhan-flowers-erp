import { isAbsolute, resolve } from 'path';

function resolveConfiguredPath(configuredPath: string | undefined, defaultRelativePath: string) {
  const value = configuredPath?.trim() || defaultRelativePath;
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

export function stockImageRoot() {
  return resolveConfiguredPath(process.env.STOCK_IMAGE_ROOT, 'uploads/stock-cards');
}

export function stockImageFallbackRoot() {
  const configuredPath = process.env.STOCK_IMAGE_FALLBACK_ROOT?.trim();
  if (!configuredPath) return null;

  const fallbackRoot = resolveConfiguredPath(configuredPath, configuredPath);
  return fallbackRoot.toLocaleLowerCase('tr-TR') === stockImageRoot().toLocaleLowerCase('tr-TR')
    ? null
    : fallbackRoot;
}
