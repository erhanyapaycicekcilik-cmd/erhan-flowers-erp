const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101';
const email = process.env.DEV_VERIFY_EMAIL || 'owner@erhanflowers.com';
const password = process.env.DEV_VERIFY_PASSWORD || 'ErhanFlowers123!';

const endpoints = ['/products', '/stock-cards', '/costs'];

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, options);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message = typeof body === 'object' && body?.message ? body.message : response.statusText;
    throw new Error(`${path} -> ${response.status} ${message}`);
  }

  return body;
}

async function main() {
  const login = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe: false }),
  });

  const headers = { Authorization: `Bearer ${login.token}` };

  for (const endpoint of endpoints) {
    const body = await request(endpoint, { headers });
    const count = Array.isArray(body) ? body.length : 'ok';
    console.log(`${endpoint} OK (${count})`);
  }
}

main().catch((error) => {
  console.error(`Development endpoint verification failed: ${error.message}`);
  process.exit(1);
});
