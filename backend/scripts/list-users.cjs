const { PrismaClient } = require('../src/generated/prisma-client');
const prisma = new PrismaClient();
prisma.user.findMany({ select: { name: true, email: true, role: true } })
  .then(users => {
    users.forEach(u => console.log(`${u.role} | ${u.name} | ${u.email}`));
  })
  .finally(() => prisma.$disconnect());
