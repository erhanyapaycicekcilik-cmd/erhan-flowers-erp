const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./src/generated/prisma-client');

const prisma = new PrismaClient();
const newPassword = process.argv[2] || 'ChangeMe123!';

async function main() {
  const hash = await bcrypt.hash(newPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: 'owner@erhanflowers.com' },
    update: { passwordHash: hash },
    create: {
      email: 'owner@erhanflowers.com',
      passwordHash: hash,
      role: 'OWNER',
      name: 'Erhan',
    },
  });
  console.log('Sifre sifirlandı:', user.email);
  await prisma.$disconnect();
}

main().catch(console.error);
