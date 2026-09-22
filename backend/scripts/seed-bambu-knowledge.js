// Bambu Bilgi Bankası seed - sunucuda çalıştır:
// docker cp scripts/seed-bambu-knowledge.js erhan-flowers-backend-prod:/tmp/seed-bambu.js
// docker exec erhan-flowers-backend-prod node /tmp/seed-bambu.js

const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allCards = await prisma.stockCard.findMany({ where: { status: 'ACTIVE' } });

  // Bambu Yaprağı (YAP-0018) - birleştirme sonrası kalan kart
  const yaprakCard = allCards.find(c => c.name === 'Bambu Yaprağı')
    ?? allCards.find(c => c.name.toLowerCase().includes('bambu') && c.name.toLowerCase().includes('yaprak'));

  // Bambu gövde kartı
  const govdeCard = allCards.find(c => c.name.toLowerCase().includes('bambu') && c.name.toLowerCase().includes('gövde'))
    ?? allCards.find(c => c.name.toLowerCase().includes('bambu') && c.name.toLowerCase().includes('govde'))
    ?? allCards.find(c => c.name.toLowerCase().includes('bambu') && !c.name.toLowerCase().includes('yaprak'));

  console.log('Yaprak:', yaprakCard ? `${yaprakCard.id} - ${yaprakCard.name}` : 'bulunamadı');
  console.log('Gövde:', govdeCard ? `${govdeCard.id} - ${govdeCard.name}` : 'bulunamadı');

  // Bitki türü
  let plantType = await prisma.knowledgePlantType.findFirst({ where: { normalizedName: 'bambu' } });
  if (!plantType) {
    plantType = await prisma.knowledgePlantType.create({
      data: {
        name: 'Bambu',
        normalizedName: 'bambu',
        defaultLeafStockCardId: yaprakCard?.id ?? null,
        defaultTrunkStockCardId: govdeCard?.id ?? null,
      },
    });
    console.log('Bitki türü oluşturuldu: id=' + plantType.id);
  } else {
    await prisma.knowledgePlantType.update({
      where: { id: plantType.id },
      data: { isActive: true, defaultLeafStockCardId: yaprakCard?.id ?? plantType.defaultLeafStockCardId, defaultTrunkStockCardId: govdeCard?.id ?? plantType.defaultTrunkStockCardId },
    });
    console.log('Bitki türü güncellendi: id=' + plantType.id);
  }

  // Alias
  const existingAlias = await prisma.knowledgeAlias.findFirst({ where: { normalizedAlias: 'bambu', plantTypeId: plantType.id } });
  if (!existingAlias) {
    await prisma.knowledgeAlias.create({ data: { alias: 'Bambu', normalizedAlias: 'bambu', entityType: 'PLANT_TYPE', plantTypeId: plantType.id, priority: 10 } });
    console.log('Alias eklendi: bambu');
  }

  // Reçete profili
  let recipe = await prisma.knowledgeRecipeProfile.findFirst({ where: { plantTypeId: plantType.id, isDefault: true } });
  if (!recipe) {
    recipe = await prisma.knowledgeRecipeProfile.create({
      data: {
        name: 'Bambu Demeti',
        plantTypeId: plantType.id,
        isDefault: true,
        priority: 10,
        actionJson: { leafStepCm: 10, leavesPerStep: 1 },
        items: {
          create: [
            { componentType: 'TRUNK', displayName: 'Bambu Gövde', quantity: 1, unit: govdeCard?.unit ?? 'Adet', stockCardId: govdeCard?.id ?? null, source: govdeCard ? 'AUTO' : 'MANUAL', sortOrder: 1 },
            { componentType: 'LEAF', displayName: 'Bambu Yaprak', quantity: 0, unit: yaprakCard?.unit ?? 'Adet', stockCardId: yaprakCard?.id ?? null, source: yaprakCard ? 'AUTO' : 'MANUAL', sortOrder: 2 },
          ],
        },
      },
    });
    console.log('Reçete profili oluşturuldu: id=' + recipe.id);
  }

  await prisma.knowledgePlantType.update({ where: { id: plantType.id }, data: { defaultRecipeId: recipe.id } });
  console.log('TAMAMLANDI - Bambu için Reçete Getir artık çalışacak.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
