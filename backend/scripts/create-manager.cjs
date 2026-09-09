// Kullanim: MANAGER_EMAIL=xxx MANAGER_PASS=xxx node scripts/create-manager.cjs
const { PrismaClient } = require('../src/generated/prisma-client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.MANAGER_EMAIL;
  const password = process.env.MANAGER_PASS;
  if (!email || !password) { console.error('MANAGER_EMAIL ve MANAGER_PASS gerekli'); process.exit(1); }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: 'Mudur', email, passwordHash: hash, role: 'MANAGER' },
  });
  console.log('Olusturuldu:', user.email, user.role);
}

main().catch(console.error).finally(() => prisma.$disconnect());
