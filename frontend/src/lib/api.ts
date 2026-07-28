function resolveApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

  if (typeof window === 'undefined') return configuredUrl;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return configuredUrl;

  const configuredPort = new URL(configuredUrl).port || '8000';
  return `${window.location.protocol}//${window.location.hostname}:${configuredPort}`;
}

export const apiBaseUrl = resolveApiBaseUrl();

export const uploadUrl = apiBaseUrl;

type ApiOptions = RequestInit & {
  json?: unknown;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body;
  const token = getStoredToken();

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body,
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? 'İşlem tamamlanamadı.');
  }

  if (response.headers.get('content-type')?.includes('application/json')) {
    return response.json();
  }

  return undefined as T;
}

export function apiFileUrl(path: string) {
  const cleanPath = String(path ?? '').trim();
  if (!cleanPath) return '';
  if (/^https?:\/\//i.test(cleanPath)) return cleanPath;

  const webPath = cleanPath
    .replace(/\\/g, '/')
    .replace(/^[A-Za-z]:\/.*\/stock-images\//, '/stock-images/')
    .replace(/^[A-Za-z]:\/.*\/uploads\//, '/uploads/');

  const normalizedPath = webPath.startsWith('/') ? webPath : `/${webPath}`;
  return `${apiBaseUrl}${encodeURI(normalizedPath)}`;
}

export function saveAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}
