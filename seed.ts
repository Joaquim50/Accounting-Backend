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

  const employeeNames = [
    'Rohan Sharma',
    'Priya Patel',
    'Amit Verma',
    'Sneha Reddy',
    'Vikram Malhotra',
    'Ananya Sen',
    'Deepak Gupta',
    'Meera Nair',
    'Rajesh Rao',
    'Kavita Joshi'
  ];

  console.log('Seeding employees...');
  for (const name of employeeNames) {
    const existing = await prisma.employee.findFirst({
      where: { name, deletedAt: null }
    });
    if (!existing) {
      const emp = await prisma.employee.create({
        data: { name }
      });
      console.log('Created employee:', emp.name);
    } else {
      console.log('Employee already exists:', name);
    }
  }

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
