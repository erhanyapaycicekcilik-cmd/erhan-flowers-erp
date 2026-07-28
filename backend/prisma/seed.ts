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
  'Beyaz KÃ¼re',
  'Siyah KÃ¼re',
  'Siyah Luna',
  'Nergiz',
  'Metal',
];

const masterFamilies = [
  {
    categoryName: 'Yapay AÄŸaÃ§lar',
    families: [
      'Ficus',
      'Benjamin',
      'Areka',
      'Strelitzia',
      'Muz AÄŸacÄ±',
      'Zeytin AÄŸacÄ±',
      'KauÃ§uk AÄŸacÄ±',
      'Palmiye',
      'Monstera / Deve TabanÄ±',
      'Sakura',
      'Bahar AÄŸacÄ±',
      'Begonvil AÄŸacÄ±',
      'Okaliptus AÄŸacÄ±',
      'ÅimÅŸir AÄŸacÄ±',
      'DiÄŸer Yapay AÄŸaÃ§',
    ],
  },
  {
    categoryName: 'Bambu',
    families: ['Bambu Tekli', 'Bambu SaksÄ±lÄ±', 'Bambu SeperatÃ¶r', 'Bambu Paravan', 'DiÄŸer Bambu'],
  },
  {
    categoryName: 'Ã‡iÃ§ekler',
    families: [
      'Demet Ã‡iÃ§ek',
      'Dal Ã‡iÃ§ek',
      'SaksÄ±lÄ± Ã‡iÃ§ek',
      'Orkide',
      'GÃ¼l',
      'Lale',
      'Kokina',
      'Bahar DalÄ±',
      'Okaliptus DalÄ±',
      'DiÄŸer Yapay Ã‡iÃ§ek',
    ],
  },
  {
    categoryName: 'SarmaÅŸÄ±k ve Dikey BahÃ§e',
    families: ['SarmaÅŸÄ±k', 'Dikey BahÃ§e', 'Yapay Ã‡it', 'Duvar Kaplama', 'DiÄŸer SarmaÅŸÄ±k / Duvar ÃœrÃ¼nÃ¼'],
  },
  {
    categoryName: 'SaksÄ±lar',
    families: ['Plastik SaksÄ±', 'Metal SaksÄ±', 'Fiber SaksÄ±', 'MDF SaksÄ±', 'Dekoratif SaksÄ±', 'DiÄŸer SaksÄ±'],
  },
  {
    categoryName: 'DiÄŸer',
    families: ['Masa ÃœstÃ¼ Yapay Bitki', 'Dekoratif Bitki', 'Paravan ve SeperatÃ¶r', 'Ã–zel Ãœretim', 'DiÄŸer ÃœrÃ¼n'],
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
    { name: 'AÄŸaÃ§lar', codePrefix: 'ERH', startCode: 1000, currentCode: 999 },
    { name: 'Bambu SeperatÃ¶r', codePrefix: 'ERH', startCode: 2000, currentCode: 1999 },
    { name: 'Tek Bambu', codePrefix: 'ERH', startCode: 3000, currentCode: 2999 },
    { name: 'Ã‡iÃ§ek Buketleri', codePrefix: 'ERH', startCode: 4000, currentCode: 3999 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        codePrefix: category.codePrefix,
        startCode: category.startCode,
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
          defaultKeywords: isFicus ? ['ficus', 'yapay ficus', 'ficus aÄŸacÄ±'] : makeKeywords(familyName),
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
          defaultKeywords: isFicus ? ['ficus', 'yapay ficus', 'ficus aÄŸacÄ±'] : makeKeywords(familyName),
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
    where: { categoryName: 'Yapay AÄŸaÃ§lar', name: 'Ficus' },
  });

  const treeCategory = await prisma.category.findUnique({ where: { name: 'AÄŸaÃ§lar' } });
  const ficusFamily = await prisma.productionFamily.upsert({
    where: { familyName: 'Yapay Ficus AÄŸacÄ±' },
    update: {
      masterId: ficusMaster?.id,
      categoryId: treeCategory?.id,
      familyCode: 'FICUS',
      mainModelCode: 'ERH-FICUS',
      description: 'Trendyol Ficus satÄ±ÅŸ varyasyonlarÄ± iÃ§in pilot Ã¼rÃ¼n ailesi.',
      keywords: ['ficus', 'yapay ficus', 'ficus aÄŸacÄ±'],
      autoMatchingEnabled: false,
      status: RecordStatus.ACTIVE,
    },
    create: {
      masterId: ficusMaster?.id,
      familyName: 'Yapay Ficus AÄŸacÄ±',
      categoryId: treeCategory?.id,
      familyCode: 'FICUS',
      mainModelCode: 'ERH-FICUS',
      description: 'Trendyol Ficus satÄ±ÅŸ varyasyonlarÄ± iÃ§in pilot Ã¼rÃ¼n ailesi.',
      keywords: ['ficus', 'yapay ficus', 'ficus aÄŸacÄ±'],
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
      templateName: 'Ficus Ortak ReÃ§ete Åablonu',
      description: 'Stok kartÄ± eÅŸleÅŸtirmeleri kullanÄ±cÄ± tarafÄ±ndan yapÄ±lacak pilot ÅŸablon.',
      vatPercent: 20,
      defaultCommissionPercent: 20,
      status: RecordStatus.ACTIVE,
    },
    create: {
      familyId: ficusFamily.id,
      templateName: 'Ficus Ortak ReÃ§ete Åablonu',
      description: 'Stok kartÄ± eÅŸleÅŸtirmeleri kullanÄ±cÄ± tarafÄ±ndan yapÄ±lacak pilot ÅŸablon.',
      vatPercent: 20,
      defaultCommissionPercent: 20,
      status: RecordStatus.ACTIVE,
    },
  });

  const componentSeeds = [
    { componentName: 'Yaprak', costGroup: 'LEAF' as const, scope: 'COMMON' as const, unit: 'adet' },
    { componentName: 'GÃ¶vde', costGroup: 'TRUNK' as const, scope: 'COMMON' as const, unit: 'adet' },
    { componentName: 'Silikon', costGroup: 'CONSUMABLE' as const, scope: 'COMMON' as const, unit: 'gr' },
    { componentName: 'Ä°ÅŸÃ§ilik', costGroup: 'LABOR' as const, scope: 'COMMON' as const, unit: 'iÅŸ' },
    { componentName: 'Elektrik', costGroup: 'ELECTRICITY' as const, scope: 'COMMON' as const, unit: 'pay' },
    { componentName: 'Paketleme', costGroup: 'PACKAGING' as const, scope: 'COMMON' as const, unit: 'adet' },
    { componentName: 'Boy farkÄ± ek gÃ¶vde/yaprak', costGroup: 'TRUNK' as const, scope: 'SIZE_VARIANT' as const, unit: 'adet' },
    { componentName: 'SaksÄ± varyasyonu', costGroup: 'POT' as const, scope: 'POT_VARIANT' as const, unit: 'adet' },
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
  return `${categoryName} kategorisi iÃ§in hazÄ±r ${name} Ã¼rÃ¼n ailesi.`;
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
    .replace(/Ä±/g, 'i')
    .replace(/ÄŸ/g, 'g')
    .replace(/Ã¼/g, 'u')
    .replace(/ÅŸ/g, 's')
    .replace(/Ã¶/g, 'o')
    .replace(/Ã§/g, 'c');
}

main().finally(async () => {
  await prisma.$disconnect();
});

