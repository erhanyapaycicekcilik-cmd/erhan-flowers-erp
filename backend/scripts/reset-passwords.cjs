// Kullanim: OWNER_PASS=xxx MANAGER_PASS=xxx STAFF_PASS=xxx node scripts/reset-passwords.cjs
const { PrismaClient } = require('../src/generated/prisma-client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const updates = [
  { role: 'OWNER',   password: process.env.OWNER_PASS   || '' },
  { role: 'MANAGER', password: process.env.MANAGER_PASS || '' },
  { role: 'STAFF',   password: process.env.STAFF_PASS   || '' },
];

async function main() {
  for (const upd of updates) {
    if (!upd.password) { console.log(`${upd.role}: sifre belirtilmedi, atlandi`); continue; }
    const hash = await bcrypt.hash(upd.password, 10);
    const result = await prisma.user.updateMany({ where: { role: upd.role }, data: { passwordHash: hash } });
    console.log(`${upd.role}: ${result.count} kullanici guncellendi`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
