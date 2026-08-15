const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
loadEnvFile(process.env.ENV_FILE || path.join(backendRoot, '.env.dev'));

const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8101';
const ownerEmail = process.env.DEV_VERIFY_OWNER_EMAIL || 'owner@erhanflowers.com';
const ownerPassword = process.env.DEV_VERIFY_OWNER_PASSWORD || 'ErhanFlowers123!';
const staffEmail = process.env.DEV_VERIFY_STAFF_EMAIL || 'personel@erhanflowers.com';
const staffPassword = process.env.DEV_VERIFY_STAFF_PASSWORD || '123456';

const ownerChecks = [
  ['/auth/me', 'Oturum'],
  ['/dashboard', 'Dashboard'],
  ['/products', 'Eski ürün listesi'],
  ['/product-center/entries', 'Ürün Merkezi'],
  ['/categories', 'Kategoriler'],
  ['/stock-cards', 'Stok kartları'],
  ['/costs', 'Eski maliyet'],
  ['/costs/products', 'Maliyet ürünleri'],
  ['/production-costs/families', 'Üretim aileleri'],
  ['/production-costs/templates', 'Reçete şablonları'],
  ['/production-costs/progress', 'Maliyet ilerleme'],
  ['/media', 'Medya'],
  ['/sales', 'Satış'],
  ['/sales/crm/dashboard', 'CRM dashboard'],
  ['/sales/crm/customers', 'CRM müşteri'],
  ['/sales/crm/reports', 'CRM rapor'],
  ['/sales/crm/reminders', 'CRM hatırlatma'],
  ['/deliveries', 'Teslimat'],
  ['/staff/tasks', 'Personel görev'],
  ['/finance/bootstrap', 'Finans başlangıç'],
  ['/finance/summary', 'Finans özet'],
  ['/integrations/accounts', 'Entegrasyon hesapları'],
  ['/integrations/orders/summary', 'Entegrasyon sipariş özeti'],
  ['/integrations/errors', 'Entegrasyon hataları'],
  ['/publishing/products', 'Yayınlama ürünleri'],
  ['/seo-products', 'SEO ürünleri'],
  ['/knowledge-base/plant-types', 'Bilgi merkezi'],
  ['/stock-counts', 'Stok sayım'],
];

const staffAllowedChecks = [
  ['/auth/me', 'Personel oturum'],
  ['/dashboard', 'Personel dashboard'],
  ['/products', 'Personel eski ürün listesi'],
  ['/product-center/entries', 'Personel ürün merkezi'],
  ['/stock-cards', 'Personel stok'],
  ['/media', 'Personel medya'],
  ['/sales', 'Personel satış'],
  ['/deliveries', 'Personel teslimat'],
  ['/staff/tasks', 'Personel görev'],
];

const staffBlockedChecks = [
  ['/costs', 'Personel eski maliyet engeli'],
  ['/production-costs/families', 'Personel üretim maliyeti engeli'],
  ['/finance/summary', 'Personel finans engeli'],
  ['/publishing/products', 'Personel yayınlama engeli'],
  ['/knowledge-base/plant-types', 'Personel bilgi merkezi engeli'],
  ['/stock-counts', 'Personel stok sayım engeli'],
];

async function request(pathname, token, options = {}) {
  const response = await fetch(`${apiUrl}${pathname}`, {
    method: 'GET',
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, ok: response.ok, body };
}

async function login(email, password) {
  const response = await request('/auth/login', null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe: false }),
  });
  if (!response.ok || !response.body?.token) {
    throw new Error(`${email} girişi başarısız: ${response.status}`);
  }
  return response.body.token;
}

async function checkEndpoints(title, checks, token, expectedStatus = 200) {
  console.log(`\n${title}`);
  const failures = [];
  for (const [pathname, label] of checks) {
    const response = await request(pathname, token);
    const passed = expectedStatus === 200 ? response.ok : response.status === expectedStatus;
    const count = Array.isArray(response.body) ? ` (${response.body.length})` : '';
    console.log(`${passed ? 'OK' : 'FAIL'} ${label}: ${pathname} -> ${response.status}${count}`);
    if (!passed) failures.push(`${label}: ${pathname} -> ${response.status}`);
  }
  return failures;
}

async function checkData(token) {
  const [products, entries, stockCards, mediaFiles, sales, customers, tasks, financeSummary, integrationAccounts] = await Promise.all([
    request('/products', token).then((response) => response.body || []),
    request('/product-center/entries', token).then((response) => response.body || []),
    request('/stock-cards', token).then((response) => response.body || []),
    request('/media', token).then((response) => response.body || []),
    request('/sales', token).then((response) => response.body || []),
    request('/sales/crm/customers', token).then((response) => response.body || []),
    request('/staff/tasks', token).then((response) => response.body || []),
    request('/finance/summary', token).then((response) => response.body || {}),
    request('/integrations/accounts', token).then((response) => response.body || []),
  ]);

  const dataSets = {
    products,
    productCenterEntries: entries,
    stockCards,
    mediaFiles,
    sales,
    customers,
    staffTasks: tasks,
    integrationAccounts,
  };

  console.log('\nVeri sayımları');
  Object.entries(dataSets).forEach(([key, value]) => console.log(`OK ${key}: ${Array.isArray(value) ? value.length : 'ok'}`));
  console.log(`OK financeSummary: ${typeof financeSummary === 'object' ? 'ok' : 'empty'}`);

  const saleStatuses = countBy(sales, 'status');
  const taskStatuses = countBy(tasks, 'status');
  console.log('\nSatış statüleri');
  printCountMap(saleStatuses);
  console.log('\nPersonel görev statüleri');
  printCountMap(taskStatuses);

  const warnings = [];
  const entryMissingIdentity = entries.filter((entry) => !entry.productName || !entry.barcode || !entry.modelCode).length;
  const entryMissingProduct = entries.filter((entry) => !entry.productId).length;
  const entryMissingImage = entries.filter((entry) => !Array.isArray(entry.images) || entry.images.length === 0).length;
  const stockMissingIdentity = stockCards.filter((card) => !card.name || !card.sku).length;
  const duplicateModelCodes = duplicateCount(entries.map((entry) => entry.modelCode).filter(Boolean));
  const duplicateBarcodes = duplicateCount(entries.map((entry) => entry.barcode).filter(Boolean));
  const duplicateStockSkus = duplicateCount(stockCards.map((card) => card.sku).filter(Boolean));
  const mojibakeHits = Object.entries(dataSets)
    .map(([key, value]) => [key, countMojibake(value)])
    .filter(([, count]) => count > 0);

  if (entryMissingIdentity > 0) warnings.push(`Ürün Merkezi kimlik bilgisi eksik kayıt: ${entryMissingIdentity}`);
  if (entryMissingProduct > 0) warnings.push(`Ürün kartına bağlı olmayan Ürün Merkezi kaydı: ${entryMissingProduct}`);
  if (entryMissingImage > 0) warnings.push(`Görseli olmayan Ürün Merkezi kaydı: ${entryMissingImage}`);
  if (stockMissingIdentity > 0) warnings.push(`Adı veya stok kodu eksik stok kartı: ${stockMissingIdentity}`);
  if (duplicateModelCodes > 0) warnings.push(`Tekrarlı model kodu grubu: ${duplicateModelCodes}`);
  if (duplicateBarcodes > 0) warnings.push(`Tekrarlı barkod grubu: ${duplicateBarcodes}`);
  if (duplicateStockSkus > 0) warnings.push(`Tekrarlı stok kodu grubu: ${duplicateStockSkus}`);
  if (tasks.length > 0 && Object.keys(taskStatuses).length === 1 && taskStatuses.NEW === tasks.length) warnings.push(`Tüm personel görevleri NEW durumunda: ${tasks.length}`);
  mojibakeHits.forEach(([key, count]) => warnings.push(`Bozuk Türkçe şüphesi (${key}): ${count}`));

  console.log('\nVeri uyarıları');
  if (warnings.length === 0) {
    console.log('OK Kritik veri uyarısı yok.');
  } else {
    warnings.forEach((warning) => console.log(`WARN ${warning}`));
  }

  return warnings;
}

function loadEnvFile(envPath) {
  const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(backendRoot, envPath);
  if (!fs.existsSync(resolved)) return;
  const lines = fs.readFileSync(resolved, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"(.*)"$/, '$1');
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  console.log(`Geliştirme hazırlık kontrolü: ${apiUrl}`);
  const ownerToken = await login(ownerEmail, ownerPassword);
  const staffToken = await login(staffEmail, staffPassword);

  const failures = [
    ...(await checkEndpoints('Owner okuma kontrolleri', ownerChecks, ownerToken)),
    ...(await checkEndpoints('Personel okuma kontrolleri', staffAllowedChecks, staffToken)),
    ...(await checkEndpoints('Personel yetki engelleri', staffBlockedChecks, staffToken, 403)),
  ];
  const warnings = await checkData(ownerToken);

  console.log('\nSonuç');
  if (failures.length > 0) {
    failures.forEach((failure) => console.log(`FAIL ${failure}`));
    process.exit(1);
  }
  console.log(warnings.length > 0 ? `OK Teknik kontrol geçti, ${warnings.length} veri uyarısı var.` : 'OK Teknik kontrol geçti, veri uyarısı yok.');
}

function countBy(items, key) {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const value = item?.[key] || 'EMPTY';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function printCountMap(counts) {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    console.log('OK kayıt yok');
    return;
  }
  entries.forEach(([key, value]) => console.log(`OK ${key}: ${value}`));
}

function duplicateCount(values) {
  const counts = countBy(values.map((value) => ({ value })), 'value');
  return Object.values(counts).filter((count) => count > 1).length;
}

function countMojibake(value) {
  const text = JSON.stringify(value ?? '');
  return (text.match(/[ÃÅÄÂ�]/g) || []).length;
}

main().catch((error) => {
  console.error(`Hazırlık kontrolü başarısız: ${error.message}`);
  process.exit(1);
});
