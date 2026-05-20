import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      vendorType: true,
      companyName: true,
      vendorName: true
    }
  });
  console.log(JSON.stringify(vendors, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
