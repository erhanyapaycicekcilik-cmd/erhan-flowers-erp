import { PrismaClient, RecordStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const defaultFicusSizes = ['160 cm', '170 cm', '180 cm', '190 cm', '200 cm'];
const defaultFicusPots = [
  'Beyaz Plastik',
  'Siyah Plastik',
  'Beyaz Vega',
  'Siyah Vega',
  'Beyaz Lilyum',
  'Siyah Lilyum',
  'Beyaz Küre',
  'Siyah Küre',
  'Siyah Luna',
  'Nergiz',
  'Metal',
];

const masterFamilies = [
  {
    categoryName: 'Yapay Ağaçlar',
    families: [
      'Ficus',
      'Benjamin',
      'Areka',
      'Strelitzia',
      'Muz Ağacı',
      'Zeytin Ağacı',
      'Kauçuk Ağacı',
      'Palmiye',
      'Monstera / Deve Tabanı',
      'Sakura',
      'Bahar Ağacı',
      'Begonvil Ağacı',
      'Okaliptus Ağacı',
      'Şimşir Ağacı',
      'Diğer Yapay Ağaç',
    ],
  },
  {
    categoryName: 'Bambu',
    families: ['Bambu Tekli', 'Bambu Saksılı', 'Bambu Seperatör', 'Bambu Paravan', 'Diğer Bambu'],
  },
  {
    categoryName: 'Çiçekler',
    families: [
      'Demet Çiçek',
      'Dal Çiçek',
      'Saksılı Çiçek',
      'Orkide',
      'Gül',
      'Lale',
      'Kokina',
      'Bahar Dalı',
      'Okaliptus Dalı',
      'Diğer Yapay Çiçek',
    ],
  },
  {
    categoryName: 'Sarmaşık ve Dikey Bahçe',
    families: ['Sarmaşık', 'Dikey Bahçe', 'Yapay Çit', 'Duvar Kaplama', 'Diğer Sarmaşık / Duvar Ürünü'],
  },
  {
    categoryName: 'Saksılar',
    families: ['Plastik Saksı', 'Metal Saksı', 'Fiber Saksı', 'MDF Saksı', 'Dekoratif Saksı', 'Diğer Saksı'],
  },
  {
    categoryName: 'Diğer',
    families: ['Masa Üstü Yapay Bitki', 'Dekoratif Bitki', 'Paravan ve Seperatör', 'Özel Üretim', 'Diğer Ürün'],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('ErhanFlowers123!', 12);
  const staffPasswordHash = await bcrypt.hash('123456', 12);

  await prisma.user.upsert({
    where: { email: 'owner@erhanflowers.com' },
    update: { passwordHash, role: UserRole.OWNER, status: RecordStatus.ACTIVE },
    create: {
      name: 'Erhan Flowers Owner',
      email: 'owner@erhanflowers.com',
      passwordHash,
      role: UserRole.OWNER,
      status: RecordStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: 'personel@erhanflowers.com' },
    update: { passwordHash: staffPasswordHash, role: UserRole.STAFF, status: RecordStatus.ACTIVE },
    create: {
      name: 'Erhan Flowers Personel',
      email: 'personel@erhanflowers.com',
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
      status: RecordStatus.ACTIVE,
    },
  });

  const categories = [
    { name: 'Ağaçlar', codePrefix: 'ERH', startCode: 1000, currentCode: 999, trendyolCategoryId: 2995 },
    { name: 'Bambu Seperatör', codePrefix: 'ERH', startCode: 2000, currentCode: 1999, trendyolCategoryId: 2995 },
    { name: 'Tek Bambu', codePrefix: 'ERH', startCode: 3000, currentCode: 2999, trendyolCategoryId: 2995 },
    { name: 'Çiçek Buketleri', codePrefix: 'ERH', startCode: 4000, currentCode: 3999, trendyolCategoryId: 2995 },
    { name: 'Saksı', codePrefix: 'ERH', startCode: 5000, currentCode: 4999, trendyolCategoryId: 2615 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        codePrefix: category.codePrefix,
        startCode: category.startCode,
        trendyolCategoryId: category.trendyolCategoryId,
        status: RecordStatus.ACTIVE,
      },
      create: category,
    });
  }

  let sortOrder = 1;
  for (const group of masterFamilies) {
    for (const familyName of group.families) {
      const isFicus = familyName === 'Ficus';
      await prisma.productFamilyMaster.upsert({
        where: {
          categoryName_name: {
            categoryName: group.categoryName,
            name: familyName,
          },
        },
        update: {
          familyCode: makeFamilyCode(familyName),
          description: makeMasterDescription(familyName, group.categoryName),
          defaultKeywords: isFicus ? ['ficus', 'yapay ficus', 'ficus ağacı'] : makeKeywords(familyName),
          defaultSizeOptions: isFicus ? defaultFicusSizes : [],
          defaultPotOptions: isFicus ? defaultFicusPots : [],
          sortOrder,
          status: RecordStatus.ACTIVE,
        },
        create: {
          categoryName: group.categoryName,
          name: familyName,
          familyCode: makeFamilyCode(familyName),
          description: makeMasterDescription(familyName, group.categoryName),
          defaultKeywords: isFicus ? ['ficus', 'yapay ficus', 'ficus ağacı'] : makeKeywords(familyName),
          defaultSizeOptions: isFicus ? defaultFicusSizes : [],
          defaultPotOptions: isFicus ? defaultFicusPots : [],
          sortOrder,
          status: RecordStatus.ACTIVE,
        },
      });
      sortOrder += 1;
    }
  }

  const ficusMaster = await prisma.productFamilyMaster.findFirst({
    where: { categoryName: 'Yapay Ağaçlar', name: 'Ficus' },
  });

  const treeCategory = await prisma.category.findUnique({ where: { name: 'Ağaçlar' } });
  const ficusFamily = await prisma.productionFamily.upsert({
    where: { familyName: 'Yapay Ficus Ağacı' },
    update: {
      masterId: ficusMaster?.id,
      categoryId: treeCategory?.id,
      familyCode: 'FICUS',
      mainModelCode: 'ERH-FICUS',
      description: 'Trendyol Ficus satış varyasyonları için pilot ürün ailesi.',
      keywords: ['ficus', 'yapay ficus', 'ficus ağacı'],
      autoMatchingEnabled: false,
      status: RecordStatus.ACTIVE,
    },
    create: {
      masterId: ficusMaster?.id,
      familyName: 'Yapay Ficus Ağacı',
      categoryId: treeCategory?.id,
      familyCode: 'FICUS',
      mainModelCode: 'ERH-FICUS',
      description: 'Trendyol Ficus satış varyasyonları için pilot ürün ailesi.',
      keywords: ['ficus', 'yapay ficus', 'ficus ağacı'],
      autoMatchingEnabled: false,
      status: RecordStatus.ACTIVE,
    },
  });

  for (const [index, sizeLabel] of defaultFicusSizes.entries()) {
    await prisma.productionSizeOption.upsert({
      where: { familyId_sizeLabel: { familyId: ficusFamily.id, sizeLabel } },
      update: { sortOrder: index + 1 },
      create: { familyId: ficusFamily.id, sizeLabel, sortOrder: index + 1 },
    });
  }

  for (const [index, potName] of defaultFicusPots.entries()) {
    await prisma.productionPotOption.upsert({
      where: { familyId_potName: { familyId: ficusFamily.id, potName } },
      update: { sortOrder: index + 1 },
      create: { familyId: ficusFamily.id, potName, sortOrder: index + 1 },
    });
  }

  const template = await prisma.productionRecipeTemplate.upsert({
    where: { id: 1 },
    update: {
      familyId: ficusFamily.id,
      templateName: 'Ficus Ortak Reçete Şablonu',
      description: 'Stok kartı eşleştirmeleri kullanıcı tarafından yapılacak pilot şablon.',
      vatPercent: 20,
      defaultCommissionPercent: 20,
      status: RecordStatus.ACTIVE,
    },
    create: {
      familyId: ficusFamily.id,
      templateName: 'Ficus Ortak Reçete Şablonu',
      description: 'Stok kartı eşleştirmeleri kullanıcı tarafından yapılacak pilot şablon.',
      vatPercent: 20,
      defaultCommissionPercent: 20,
      status: RecordStatus.ACTIVE,
    },
  });

  const componentSeeds = [
    { componentName: 'Yaprak', costGroup: 'LEAF' as const, scope: 'COMMON' as const, unit: 'adet' },
    { componentName: 'Gövde', costGroup: 'TRUNK' as const, scope: 'COMMON' as const, unit: 'adet' },
    { componentName: 'Silikon', costGroup: 'CONSUMABLE' as const, scope: 'COMMON' as const, unit: 'gr' },
    { componentName: 'İşçilik', costGroup: 'LABOR' as const, scope: 'COMMON' as const, unit: 'iş' },
    { componentName: 'Elektrik', costGroup: 'ELECTRICITY' as const, scope: 'COMMON' as const, unit: 'pay' },
    { componentName: 'Paketleme', costGroup: 'PACKAGING' as const, scope: 'COMMON' as const, unit: 'adet' },
    { componentName: 'Boy farkı ek gövde/yaprak', costGroup: 'TRUNK' as const, scope: 'SIZE_VARIANT' as const, unit: 'adet' },
    { componentName: 'Saksı varyasyonu', costGroup: 'POT' as const, scope: 'POT_VARIANT' as const, unit: 'adet' },
  ];

  for (const item of componentSeeds) {
    const existing = await prisma.productionTemplateComponent.findFirst({
      where: {
        templateId: template.id,
        componentName: item.componentName,
        scope: item.scope,
      },
    });

    if (!existing) {
      await prisma.productionTemplateComponent.create({
        data: {
          templateId: template.id,
          componentName: item.componentName,
          costGroup: item.costGroup,
          scope: item.scope,
          quantity: 0,
          unit: item.unit,
        },
      });
    }
  }
}

function makeMasterDescription(name: string, categoryName: string) {
  return `${categoryName} kategorisi için hazır ${name} ürün ailesi.`;
}

function makeKeywords(name: string) {
  return Array.from(new Set([name.toLocaleLowerCase('tr-TR'), normalizeKeyword(name)]));
}

function makeFamilyCode(name: string) {
  return normalizeKeyword(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 32);
}

function normalizeKeyword(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

main().finally(async () => {
  await prisma.$disconnect();
});
