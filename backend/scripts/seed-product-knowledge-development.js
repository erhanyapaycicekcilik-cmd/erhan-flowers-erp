const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.dev'), override: true });

if (!String(process.env.DATABASE_URL || '').includes('erhan_flowers_panel_dev') || !String(process.env.DATABASE_URL || '').includes(':5433/')) {
  throw new Error('Bu komut yalnızca 5433 üzerindeki development veritabanında çalıştırılabilir.');
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/s\?yah/g, 'siyah')
    .replace(/g\?vde/g, 'govde')
    .replace(/yapra\?\?/g, 'yapragi')
    .replace(/[^a-z0-9çğıöşü?\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const family = await prisma.productionFamily.findFirst({
    where: { OR: [{ familyName: { contains: 'Bambu', mode: 'insensitive' } }, { familyCode: { contains: 'BAMBU', mode: 'insensitive' } }] },
    orderBy: { id: 'asc' },
  });
  if (!family) throw new Error('Development veritabanında Bambu ürün ailesi bulunamadı.');

  const stockCards = await prisma.stockCard.findMany({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } });
  const leaf = stockCards.find((item) => normalize(item.name).includes('bambu yaprak'));
  const trunk = stockCards.find((item) => normalize(item.name).includes('bambu govde') && String(item.unit).toLocaleLowerCase('tr-TR') === 'adet')
    || stockCards.find((item) => normalize(item.name).includes('bambu govde'));
  if (!leaf || !trunk) throw new Error('Bambu yaprak veya gövde stok kartı bulunamadı.');

  let plant = await prisma.knowledgePlantType.findFirst({ where: { normalizedName: 'bambu' } });
  if (!plant) {
    plant = await prisma.knowledgePlantType.create({
      data: { name: 'Bambu', normalizedName: 'bambu', productFamilyId: family.id, defaultLeafStockCardId: leaf.id, defaultTrunkStockCardId: trunk.id },
    });
  } else {
    plant = await prisma.knowledgePlantType.update({
      where: { id: plant.id },
      data: { productFamilyId: family.id, defaultLeafStockCardId: leaf.id, defaultTrunkStockCardId: trunk.id, isActive: true },
    });
  }

  for (const alias of ['bambu', 'yapay bambu', 'bambu ağacı', 'bambu agaci']) {
    const normalizedAlias = normalize(alias);
    const existing = await prisma.knowledgeAlias.findFirst({ where: { normalizedAlias, plantTypeId: plant.id } });
    if (!existing) await prisma.knowledgeAlias.create({ data: { alias, normalizedAlias, entityType: 'PLANT_TYPE', plantTypeId: plant.id, priority: alias === 'bambu' ? 10 : 20 } });
  }

  let recipe = await prisma.knowledgeRecipeProfile.findFirst({ where: { plantTypeId: plant.id, name: 'Bambu Otomatik Ana Reçetesi' } });
  if (!recipe) recipe = await prisma.knowledgeRecipeProfile.create({ data: { name: 'Bambu Otomatik Ana Reçetesi', plantTypeId: plant.id, productFamilyId: family.id, minHeightCm: 1, maxHeightCm: 999, priority: 10, isDefault: true } });
  await prisma.knowledgeRecipeItem.deleteMany({ where: { recipeProfileId: recipe.id } });
  await prisma.knowledgeRecipeItem.createMany({ data: [
    { recipeProfileId: recipe.id, stockCardId: leaf.id, componentType: 'LEAF', quantity: 0, unit: leaf.unit, sortOrder: 10 },
    { recipeProfileId: recipe.id, stockCardId: trunk.id, componentType: 'TRUNK', quantity: 1, unit: trunk.unit, sortOrder: 20 },
    { recipeProfileId: recipe.id, componentType: 'SILICONE', quantity: 1, unit: 'TL', sortOrder: 30 },
    { recipeProfileId: recipe.id, componentType: 'LABOR', quantity: 100, unit: 'TL', sortOrder: 40 },
    { recipeProfileId: recipe.id, componentType: 'OTHER', quantity: 0, unit: 'KG', isOptional: true, sortOrder: 50 },
  ] });
  await prisma.knowledgePlantType.update({ where: { id: plant.id }, data: { defaultRecipeId: recipe.id } });

  const ruleName = 'Bambu ürün adı ve boy reçetesi';
  const existingRule = await prisma.knowledgeRule.findFirst({ where: { name: ruleName } });
  const ruleData = {
    ruleType: 'RECIPE', conditionJson: { contains: ['bambu'], plant: 'bambu' },
    actionJson: { leafStepCm: 10, leavesPerStep: 1, siliconeAmount: 1, laborAmount: 100, stoneAmount: 0 },
    priority: 10, isActive: true,
  };
  if (existingRule) await prisma.knowledgeRule.update({ where: { id: existingRule.id }, data: ruleData });
  else await prisma.knowledgeRule.create({ data: { name: ruleName, ...ruleData } });

  console.log(JSON.stringify({ database: 'erhan_flowers_panel_dev', plantTypeId: plant.id, recipeProfileId: recipe.id, leafStockCardId: leaf.id, trunkStockCardId: trunk.id }, null, 2));
}

main().finally(() => prisma.$disconnect());
