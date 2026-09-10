function resolveApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

  if (typeof window === 'undefined') return configuredUrl;

  const host = window.location.hostname;

  // florayapaycicek.com production — env ayarına bakmadan her zaman api subdomain'i kullan
  if (host === 'erp.florayapaycicek.com' || host === 'florayapaycicek.com' || host === 'www.florayapaycicek.com') {
    return 'https://api.florayapaycicek.com';
  }

  if ((host === 'localhost' || host === '127.0.0.1') && /^310\d$/.test(window.location.port)) {
    // localhost'ta IPv6 sorunu — IPv4'u zorla
    const configuredPort = new URL(configuredUrl).port || '8101';
    return `${window.location.protocol}//127.0.0.1:${configuredPort}`;
  }
  if (host === 'localhost' || host === '127.0.0.1') return configuredUrl;

  const configuredHost = new URL(configuredUrl).hostname;
  if (configuredHost !== host) return configuredUrl;

  const configuredPort = new URL(configuredUrl).port || '8000';
  return `${window.location.protocol}//${host}:${configuredPort}`;
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
    if (response.status === 401 && path === '/auth/me' && typeof window !== 'undefined') {
      clearAuthToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
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
    .replace(/^[A-Za-z]:\/.*\/uploads\//, '/uploads/')
    .replace(/^\/uploads\/stock-cards\//, '/stock-images/stock-cards/');

  const normalizedPath = webPath.startsWith('/') ? webPath : `/${webPath}`;
  return `${apiBaseUrl}${encodeURI(normalizedPath)}`;
}

export function saveAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(authStorageKey(), token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(authStorageKey());
  localStorage.removeItem('auth_token');
}

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(authStorageKey()) ?? localStorage.getItem('auth_token');
}

function authStorageKey() {
  if (typeof window === 'undefined') return 'auth_token';
  return `auth_token_${window.location.hostname}_${window.location.port || 'default'}`;
}
