import { KnowledgeAliasEntityType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalize(value: string) {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findStockCard(terms: string[]) {
  const cards = await prisma.stockCard.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, sku: true },
    take: 500,
  });

  return (
    cards.find((card) => {
      const normalized = normalize(`${card.name} ${card.sku ?? ''}`);
      return terms.every((term) => normalized.includes(normalize(term)));
    }) ?? null
  );
}

async function upsertAlias(alias: string, entityType: KnowledgeAliasEntityType, target: { plantTypeId?: number; potProfileId?: number }) {
  const normalizedAlias = normalize(alias);
  const existing = await prisma.knowledgeAlias.findFirst({
    where: {
      normalizedAlias,
      entityType,
      plantTypeId: target.plantTypeId,
      potProfileId: target.potProfileId,
    },
  });

  const data = {
    alias,
    normalizedAlias,
    entityType,
    priority: alias.split(' ').length > 1 ? 10 : 50,
    isActive: true,
    plantTypeId: target.plantTypeId,
    potProfileId: target.potProfileId,
  };

  if (existing) return prisma.knowledgeAlias.update({ where: { id: existing.id }, data });
  return prisma.knowledgeAlias.create({ data });
}

async function main() {
  if (!process.env.DATABASE_URL?.includes('erhan_flowers_panel_dev')) {
    throw new Error('Bu seed yalnizca development veritabaninda calistirilabilir.');
  }

  const bambuFamily = await prisma.productionFamily.findFirst({
    where: {
      OR: [{ familyName: { contains: 'Bambu', mode: 'insensitive' } }, { familyCode: { contains: 'BAMBU', mode: 'insensitive' } }],
    },
  });

  const leafStockCard = await findStockCard(['bambu', 'yaprak']);
  const trunkStockCard = await findStockCard(['bambu', 'gövde']);
  const mdfStockCard = await findStockCard(['mdf']);

  const existingPlant = await prisma.knowledgePlantType.findFirst({ where: { normalizedName: normalize('Bambu') } });
  const plantType = existingPlant
    ? await prisma.knowledgePlantType.update({
        where: { id: existingPlant.id },
        data: {
          name: 'Bambu',
          normalizedName: normalize('Bambu'),
          productFamilyId: bambuFamily?.id,
          defaultLeafStockCardId: leafStockCard?.id,
          defaultTrunkStockCardId: trunkStockCard?.id,
          isActive: true,
        },
      })
    : await prisma.knowledgePlantType.create({
        data: {
          name: 'Bambu',
          normalizedName: normalize('Bambu'),
          description: 'Development testleri için bambu bitki türü.',
          productFamilyId: bambuFamily?.id,
          defaultLeafStockCardId: leafStockCard?.id,
          defaultTrunkStockCardId: trunkStockCard?.id,
          isActive: true,
        },
      });

  for (const alias of ['bambu', 'yapay bambu', 'bambu ağacı']) {
    await upsertAlias(alias, KnowledgeAliasEntityType.PLANT_TYPE, { plantTypeId: plantType.id });
  }

  const existingPot = await prisma.knowledgePotProfile.findFirst({ where: { normalizedName: normalize('MDF Saksı') } });
  const potProfile = existingPot
    ? await prisma.knowledgePotProfile.update({
        where: { id: existingPot.id },
        data: { name: 'MDF Saksı', normalizedName: normalize('MDF Saksı'), materialType: 'MDF', stockCardId: mdfStockCard?.id, isActive: true },
      })
    : await prisma.knowledgePotProfile.create({
        data: {
          name: 'MDF Saksı',
          normalizedName: normalize('MDF Saksı'),
          materialType: 'MDF',
          stockCardId: mdfStockCard?.id,
          priority: 10,
          isActive: true,
        },
      });

  for (const alias of ['mdf', 'mdf saksı']) {
    await upsertAlias(alias, KnowledgeAliasEntityType.POT_PROFILE, { potProfileId: potProfile.id });
  }

  const existingRecipe = await prisma.knowledgeRecipeProfile.findFirst({
    where: { name: 'Bambu Standart', plantTypeId: plantType.id },
  });
  const recipe = existingRecipe
    ? await prisma.knowledgeRecipeProfile.update({
        where: { id: existingRecipe.id },
        data: { isDefault: true, isActive: true },
      })
    : await prisma.knowledgeRecipeProfile.create({
        data: {
          name: 'Bambu Standart',
          plantTypeId: plantType.id,
          productFamilyId: bambuFamily?.id,
          priority: 10,
          isDefault: true,
          isActive: true,
        },
      });

  await prisma.knowledgePlantType.update({ where: { id: plantType.id }, data: { defaultRecipeId: recipe.id } });

  console.log({
    plantType: plantType.name,
    productFamilyLinked: Boolean(bambuFamily),
    leafStockCardLinked: Boolean(leafStockCard),
    trunkStockCardLinked: Boolean(trunkStockCard),
    mdfPotStockCardLinked: Boolean(mdfStockCard),
    recipeProfile: recipe.name,
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
