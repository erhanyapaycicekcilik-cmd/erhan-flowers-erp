import { isAbsolute, resolve } from 'path';

function resolveConfiguredPath(configuredPath: string | undefined, defaultRelativePath: string) {
  const value = configuredPath?.trim() || defaultRelativePath;
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
}

export function productImageRoot() {
  return resolveConfiguredPath(process.env.PRODUCT_IMAGE_ROOT, 'uploads/products');
}
