import fs from "node:fs";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const schemaPath = path.join(workspaceRoot, "backend", "prisma", "schema.prisma");
const outputDir = path.join(workspaceRoot, "docs", "database");
const dbmlPath = path.join(outputDir, "erhan-flowers-erp.dbml");
const reportPath = path.join(outputDir, "POSTGRESQL-DURUM-RAPORU.md");

const schema = fs.readFileSync(schemaPath, "utf8");

const scalarTypes = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes",
]);

const tableGroups = new Map([
  ["Kimlik ve urun cekirdegi", ["users", "categories", "products", "product_family_masters", "production_families"]],
  ["Stok, gorsel ve sayim", ["stock_cards", "stock_card_images", "stock_movements", "media_files", "barcode_logs", "stock_usage_logs", "stock_count_sessions", "stock_count_items", "stock_reservations"]],
  ["Uretim ve maliyet", ["production_size_options", "production_pot_options", "production_recipe_templates", "production_template_components", "trendyol_product_variants", "product_cost_drafts", "product_cost_items", "default_product_expenses", "default_product_expense_history", "product_pot_items", "production_cost_history", "product_recipes", "recipe_items", "recipe_extra_costs", "bambu_cost_rules", "bambu_cost_exceptions", "production_staff_tasks", "production_task_proofs"]],
  ["Bilgi motoru", ["knowledge_plant_types", "knowledge_aliases", "knowledge_pot_profiles", "knowledge_recipe_profiles", "knowledge_recipe_items", "knowledge_rules", "knowledge_analysis_logs", "knowledge_feedbacks"]],
  ["CRM, satis ve teslimat", ["retail_customers", "retail_customer_files", "retail_customer_notes", "retail_customer_reminders", "retail_customer_source_definitions", "retail_customer_tag_definitions", "retail_customer_tags", "retail_customer_addresses", "retail_sales", "retail_sale_status_history", "retail_sale_items", "retail_sale_payments", "retail_deliveries", "retail_print_logs"]],
  ["Finans", ["finance_accounts", "finance_categories", "finance_sales_channels", "finance_transactions", "finance_debts", "finance_marketplace_daily_records", "finance_recurring_payments", "finance_salary_records", "finance_audit_logs"]],
  ["Entegrasyon ve yayinlama", ["publishing_logs", "integration_connections", "integration_tenant_settings", "integration_sync_logs"]],
]);

function stripInlineComment(line) {
  let inQuote = false;
  for (let i = 0; i < line.length - 1; i += 1) {
    if (line[i] === '"' && line[i - 1] !== "\\") inQuote = !inQuote;
    if (!inQuote && line[i] === "/" && line[i + 1] === "/") return line.slice(0, i).trim();
  }
  return line.trim();
}

function splitTopLevel(input) {
  const result = [];
  let current = "";
  let depthParen = 0;
  let depthBracket = 0;
  let inQuote = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"' && input[i - 1] !== "\\") inQuote = !inQuote;
    if (!inQuote) {
      if (ch === "(") depthParen += 1;
      if (ch === ")") depthParen -= 1;
      if (ch === "[") depthBracket += 1;
      if (ch === "]") depthBracket -= 1;
      if (/\s/.test(ch) && depthParen === 0 && depthBracket === 0) {
        if (current) {
          result.push(current);
          current = "";
        }
        continue;
      }
    }
    current += ch;
  }
  if (current) result.push(current);
  return result;
}

function extractBlocks(kind) {
  const blocks = [];
  const pattern = new RegExp(`^${kind}\\s+(\\w+)\\s*\\{`, "gm");
  let match;
  while ((match = pattern.exec(schema))) {
    const name = match[1];
    const bodyStart = schema.indexOf("{", match.index) + 1;
    let depth = 1;
    let i = bodyStart;
    for (; i < schema.length; i += 1) {
      if (schema[i] === "{") depth += 1;
      if (schema[i] === "}") depth -= 1;
      if (depth === 0) break;
    }
    blocks.push({ name, body: schema.slice(bodyStart, i) });
  }
  return blocks;
}

function attrValue(attrs, name) {
  const start = attrs.indexOf(`${name}(`);
  if (start === -1) return null;
  let depth = 0;
  let inQuote = false;
  const valueStart = start + name.length + 1;
  for (let i = valueStart; i < attrs.length; i += 1) {
    const ch = attrs[i];
    if (ch === '"' && attrs[i - 1] !== "\\") inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === "(") depth += 1;
    if (ch === ")") {
      if (depth === 0) return attrs.slice(valueStart, i);
      depth -= 1;
    }
  }
  return null;
}

function mappedName(name, attrs) {
  const mapped = attrValue(attrs, "@map");
  if (!mapped) return name;
  const quoted = mapped.match(/"([^"]+)"/);
  return quoted?.[1] ?? name;
}

function tableName(model) {
  const mapLine = model.rawLines.find((line) => line.startsWith("@@map("));
  if (!mapLine) return model.name;
  const quoted = mapLine.match(/"([^"]+)"/);
  return quoted?.[1] ?? model.name;
}

function dbType(field) {
  const attrs = field.attrs;
  const isArray = field.type.endsWith("[]");
  const baseType = field.type.replace(/\[\]$/, "").replace(/\?$/, "");
  const decimal = attrs.match(/@db\.Decimal\(([^)]*)\)/);
  if (decimal) return `decimal(${decimal[1].replace(/\s+/g, "")})${isArray ? "[]" : ""}`;
  const varchar = attrs.match(/@db\.(VarChar|Char|Text|Uuid)\(([^)]*)\)/);
  if (varchar) return `${varchar[1].toLowerCase()}(${varchar[2]})${isArray ? "[]" : ""}`;
  const dbNative = attrs.match(/@db\.([A-Za-z0-9_]+)/);
  if (dbNative) return `${dbNative[1].toLowerCase()}${isArray ? "[]" : ""}`;
  const mapped = {
    String: "varchar",
    Boolean: "boolean",
    Int: "int",
    BigInt: "bigint",
    Float: "double precision",
    Decimal: "decimal",
    DateTime: "timestamp",
    Json: "jsonb",
    Bytes: "bytea",
  }[baseType] ?? baseType;
  return `${mapped}${isArray ? "[]" : ""}`;
}

function defaultValue(attrs) {
  const value = attrValue(attrs, "@default");
  if (!value) return null;
  const normalized = value.trim();
  if (normalized === "autoincrement()") return "`autoincrement()`";
  if (normalized === "now()") return "`now()`";
  if (normalized === "uuid()" || normalized === "cuid()") return `\`${normalized}\``;
  if (normalized.startsWith("dbgenerated(")) return `\`${normalized}\``;
  if (normalized.startsWith("\"") && normalized.endsWith("\"")) return `'${normalized.slice(1, -1).replace(/'/g, "\\'")}'`;
  if (normalized === "true" || normalized === "false") return normalized;
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return normalized;
  if (normalized.startsWith("[")) return "`[]`";
  return `'${normalized}'`;
}

function parseNamedFields(input) {
  const bracket = input.match(/\[([^\]]*)\]/);
  if (!bracket) return [];
  return bracket[1].split(",").map((field) => field.trim()).filter(Boolean);
}

const enums = extractBlocks("enum").map((block) => ({
  name: block.name,
  values: block.body
    .split(/\r?\n/)
    .map(stripInlineComment)
    .filter((line) => line && !line.startsWith("@"))
    .map((line) => line.split(/\s+/)[0]),
}));

const enumNames = new Set(enums.map((item) => item.name));

const models = extractBlocks("model").map((block) => {
  const rawLines = block.body.split(/\r?\n/).map(stripInlineComment).filter(Boolean);
  const fields = [];
  const indexes = [];
  for (const line of rawLines) {
    if (line.startsWith("@@index") || line.startsWith("@@unique")) {
      indexes.push(line);
      continue;
    }
    if (line.startsWith("@@")) continue;
    const parts = splitTopLevel(line);
    if (parts.length < 2) continue;
    const [name, type, ...attrParts] = parts;
    const attrs = attrParts.join(" ");
    const cleanType = type.replace(/\?$/, "").replace(/\[\]$/, "");
    const isColumn = scalarTypes.has(cleanType) || enumNames.has(cleanType);
    fields.push({
      name,
      type,
      attrs,
      isColumn,
      dbName: mappedName(name, attrs),
      isRequired: !type.endsWith("?") && !type.endsWith("[]"),
    });
  }
  const model = { name: block.name, rawLines, fields, indexes };
  model.dbName = tableName(model);
  return model;
});

const modelByName = new Map(models.map((model) => [model.name, model]));

function dbFieldName(model, fieldName) {
  return model.fields.find((field) => field.name === fieldName)?.dbName ?? fieldName;
}

function dbColumnNames(model, fieldNames) {
  return fieldNames.map((field) => dbFieldName(model, field));
}

function renderIndex(model, line) {
  const fields = dbColumnNames(model, parseNamedFields(line));
  if (!fields.length) return null;
  const settings = [];
  if (line.startsWith("@@unique")) settings.push("unique");
  const name = line.match(/(?:name|map):\s*"([^"]+)"/)?.[1];
  if (name) settings.push(`name: "${name}"`);
  return `    (${fields.join(", ")})${settings.length ? ` [${settings.join(", ")}]` : ""}`;
}

function renderField(field) {
  const settings = [];
  if (field.attrs.includes("@id")) settings.push("pk");
  if (field.attrs.includes("@unique")) settings.push("unique");
  if (field.isRequired && !field.attrs.includes("@id")) settings.push("not null");
  const defaultSetting = defaultValue(field.attrs);
  if (defaultSetting === "`autoincrement()`") {
    settings.push("increment");
  } else if (defaultSetting) {
    settings.push(`default: ${defaultSetting}`);
  }
  const notes = [];
  if (field.name !== field.dbName) notes.push(`Prisma: ${field.name}`);
  if (field.attrs.includes("@updatedAt")) notes.push("@updatedAt");
  if (notes.length) settings.push(`note: "${notes.join("; ")}"`);
  return `  ${field.dbName} ${dbType(field)}${settings.length ? ` [${settings.join(", ")}]` : ""}`;
}

function renderRefs() {
  const refs = [];
  const seen = new Set();
  const actionMap = new Map([
    ["Cascade", "cascade"],
    ["NoAction", "no action"],
    ["SetNull", "set null"],
    ["SetDefault", "set default"],
    ["Restrict", "restrict"],
  ]);
  for (const model of models) {
    for (const field of model.fields) {
      if (!field.attrs.includes("@relation(")) continue;
      const cleanType = field.type.replace(/\?$/, "").replace(/\[\]$/, "");
      const targetModel = modelByName.get(cleanType);
      if (!targetModel) continue;
      const relation = attrValue(field.attrs, "@relation");
      if (!relation || !relation.includes("fields:")) continue;
      const fieldsMatch = relation.match(/fields:\s*\[([^\]]+)\]/);
      const referencesMatch = relation.match(/references:\s*\[([^\]]+)\]/);
      if (!fieldsMatch || !referencesMatch) continue;
      const sourceFields = fieldsMatch[1].split(",").map((item) => item.trim());
      const targetFields = referencesMatch[1].split(",").map((item) => item.trim());
      const source = sourceFields.map((item) => `${model.dbName}.${dbFieldName(model, item)}`).join(", ");
      const target = targetFields.map((item) => `${targetModel.dbName}.${dbFieldName(targetModel, item)}`).join(", ");
      const deleteAction = relation.match(/onDelete:\s*(\w+)/)?.[1];
      const updateAction = relation.match(/onUpdate:\s*(\w+)/)?.[1];
      const settings = [];
      if (deleteAction) settings.push(`delete: ${actionMap.get(deleteAction) ?? deleteAction.toLowerCase()}`);
      if (updateAction) settings.push(`update: ${actionMap.get(updateAction) ?? updateAction.toLowerCase()}`);
      const key = `${source}>${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push(`Ref: ${sourceFields.length > 1 ? `(${source})` : source} > ${targetFields.length > 1 ? `(${target})` : target}${settings.length ? ` [${settings.join(", ")}]` : ""}`);
    }
  }
  return refs;
}

const lines = [];
lines.push("// Erhan Flowers ERP PostgreSQL schema");
lines.push("// Source: backend/prisma/schema.prisma");
lines.push("// Generated for dbdiagram.io. Do not run as a migration.");
lines.push("");

for (const item of enums) {
  lines.push(`Enum ${item.name} {`);
  for (const value of item.values) lines.push(`  ${value}`);
  lines.push("}");
  lines.push("");
}

for (const model of models) {
  lines.push(`Table ${model.dbName} {`);
  for (const field of model.fields.filter((item) => item.isColumn)) lines.push(renderField(field));
  const renderedIndexes = model.indexes.map((line) => renderIndex(model, line)).filter(Boolean);
  if (renderedIndexes.length) {
    lines.push("");
    lines.push("  indexes {");
    lines.push(...renderedIndexes);
    lines.push("  }");
  }
  lines.push("}");
  lines.push("");
}

for (const ref of renderRefs()) lines.push(ref);
lines.push("");

const groupedTables = new Set();
for (const [groupName, tableNames] of tableGroups.entries()) {
  const presentTables = tableNames.filter((table) => models.some((model) => model.dbName === table));
  presentTables.forEach((table) => groupedTables.add(table));
  lines.push(`TableGroup "${groupName}" {`);
  for (const tableName of presentTables) lines.push(`  ${tableName}`);
  lines.push("}");
  lines.push("");
}

const ungrouped = models.map((model) => model.dbName).filter((table) => !groupedTables.has(table));
if (ungrouped.length) {
  lines.push('TableGroup "Diger" {');
  for (const tableName of ungrouped) lines.push(`  ${tableName}`);
  lines.push("}");
  lines.push("");
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(dbmlPath, lines.join("\n"), "utf8");

const report = `# PostgreSQL Durum Raporu

Tarih: 2026-07-28

## Ozet

- Canli PostgreSQL \`5432\`: 67 uygulama tablosu, yaklasik 15 MB veri.
- Canli DB fiziksel semasi mevcut Prisma semasiyla uyumlu; drift bulunmadi.
- Canli DB'de Prisma migration gecmisi gorunmuyor; dort migration uygulanmamis gorunuyor. Fiziksel sema dogru olsa da migration yonetimi acisindan risk var.
- Development PostgreSQL \`5433\`: 68 tablo (\`_prisma_migrations\` dahil), yaklasik 13 MB, uygulama verisi bos seviyede.
- Development DB migration durumunu guncel gosteriyor; buna ragmen dort \`updated_at\` default farki ve \`retail_sales.idempotency_key\` unique index farki var.

## Canli Veri Sayimlari

| Alan | Deger |
| --- | ---: |
| Uygulama tablosu | 67 |
| Stok karti | 290 |
| Stok karti gorsel kaydi | 127 |
| Medya dosyasi kaydi | 139 |
| Stok hareketi | 96 |
| Urun | 2 |
| Kullanici | 2 |

## Gorsel Veri Durumu

- 285 stok kartinda \`image_path\` dolu.
- 59 kart yeni \`stock_card_images\` iliskisini kullaniyor.
- 226 kartta eski \`/uploads/...\` yolu var ve bu eski dosyalarin tamami fiziksel olarak mevcut.
- Yeni \`stock_card_images\` kayitlarinin 124 dosyasi mevcut, 3 dosyasi eksik.
- Yetim \`stock_card_images\`, yinelenen gorsel yolu, birden fazla ana gorsel ve \`imagePath/isMain\` uyusmazligi bulunmadi.

## Diagram Ciktisi

- DBML dosyasi: \`docs/database/erhan-flowers-erp.dbml\`
- Kaynak: \`backend/prisma/schema.prisma\`
- Kapsam: 67 uygulama tablosu, 32 enum, foreign key referanslari, unique constraint'ler ve index'ler.
- \`_prisma_migrations\` diagram disinda tutuldu; bu tablo uygulama modeli degil migration metadatasidir.

## Notlar

Bu calisma sadece dokumantasyon uretir. Canli/development DB'ye migration uygulanmadi, veri degistirilmedi, dosya veya gorsel silinmedi.
`;

fs.writeFileSync(reportPath, report, "utf8");

const appTableCount = (lines.join("\n").match(/^Table\s+/gm) ?? []).length;
const refCount = (lines.join("\n").match(/^Ref:/gm) ?? []).length;
console.log(JSON.stringify({
  dbmlPath,
  reportPath,
  enumCount: enums.length,
  modelCount: models.length,
  appTableCount,
  refCount,
  ungrouped,
}, null, 2));
