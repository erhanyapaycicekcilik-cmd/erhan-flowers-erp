import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const users = await prisma.user.findMany({ select: { name: true, email: true, role: true } });
users.forEach(u => console.log(`${u.role}|${u.name}|${u.email}`));
await prisma.$disconnect();
