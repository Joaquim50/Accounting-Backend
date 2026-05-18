import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './src/db';

async function seed() {
  const hash = await bcrypt.hash('admin123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@mipl.com' },
    update: {},
    create: {
      email: 'admin@mipl.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('Seeded admin user:', user.email);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
