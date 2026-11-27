#!/usr/bin/env node
/**
 * Backend'de aynı HTTP yöntemi + adrese bağlanmış birden fazla NestJS uç noktası var mı?
 * NestJS bunu uyarmadan kabul eder ve istekler ilk kaydedilene gider (ör. 11.2026: hızlı sipariş formu
 * site sipariş adresini ele geçirdi, site siparişleri 5 gün "Ad soyad zorunludur" hatası verdi).
 * Çakışma varsa çıkış kodu 1 → deploy durur.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'backend', 'src')
const files = []
;(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'generated' && e.name !== 'node_modules') walk(p) }
    else if (e.name.endsWith('.controller.ts')) files.push(p)
  }
})(root)

const str = (s) => (s == null ? '' : s.trim().replace(/^['"`]|['"`]$/g, ''))
const norm = (...parts) => '/' + parts.map((x) => x.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')
  .replace(/:[A-Za-z0-9_]+/g, ':param')

const routes = new Map()
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  // Sınıf bazında böl: her @Controller(...) yeni önek başlatır
  const re = /@Controller\(([^)]*)\)|@(Get|Post|Put|Patch|Delete|All)\(([^)]*)\)/g
  let prefix = null
  let m
  while ((m = re.exec(src))) {
    if (m[1] !== undefined || m[0].startsWith('@Controller')) {
      const arg = m[1] ?? ''
      const obj = arg.match(/path\s*:\s*(['"`][^'"`]*['"`])/)
      prefix = str(obj ? obj[1] : arg.split(',')[0])
      continue
    }
    if (prefix === null) continue
    const method = m[2].toUpperCase()
    const sub = str((m[3] ?? '').split(',')[0])
    const key = `${method} ${norm(prefix, sub)}`
    const line = src.slice(0, m.index).split('\n').length
    const where = `${path.relative(path.join(__dirname, '..'), file)}:${line}`
    if (!routes.has(key)) routes.set(key, [])
    routes.get(key).push(where)
  }
}

const dups = [...routes.entries()].filter(([, w]) => w.length > 1)
if (dups.length) {
  console.error(`Aynı adrese bağlı ${dups.length} uç nokta bulundu (biri diğerini gizler):`)
  for (const [k, w] of dups) console.error(`  ${k}\n    - ${w.join('\n    - ')}`)
  process.exit(1)
}
console.log(`Uç nokta çakışması yok (${routes.size} adres, ${files.length} controller).`)
