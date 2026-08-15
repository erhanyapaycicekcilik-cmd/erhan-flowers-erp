import { isAbsolute, resolve } from 'path';

function resolveConfiguredPath(configuredPath: string | undefined, defaultRelativePath: string) {
  const value = configuredPath?.trim() || defaultRelativePath;
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

export function stockImageRoot() {
  return resolveConfiguredPath(process.env.STOCK_IMAGE_ROOT, 'uploads/stock-cards');
}

export function stockImageFallbackRoots() {
  const configuredPaths = [
    ...(process.env.STOCK_IMAGE_FALLBACK_ROOTS ?? '')
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean),
    process.env.STOCK_IMAGE_FALLBACK_ROOT?.trim(),
    'D:\\stok görseller',
    'D:\\stok-gorseller-dev',
    'D:\\stok görseller-dev',
  ].filter(Boolean) as string[];

  const root = stockImageRoot().toLocaleLowerCase('tr-TR');
  return Array.from(new Set(configuredPaths.map((path) => resolveConfiguredPath(path, path))))
    .filter((path) => path.toLocaleLowerCase('tr-TR') !== root);
}
