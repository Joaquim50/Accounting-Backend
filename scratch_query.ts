import { prisma } from './src/db';

async function main() {
  try {
    const pis = await prisma.proformaInvoice.findMany({
      include: {
        customer: true,
        projectedSale: true,
        milestone: true,
      }
    });
    console.log('Proforma Invoices count:', pis.length);
    console.log('Sample:', JSON.stringify(pis[0], null, 2));

    const tis = await prisma.taxInvoice.findMany({
      include: {
        customer: true,
        projectedSale: true,
        milestone: true,
      }
    });
    console.log('Tax Invoices count:', tis.length);
    console.log('Sample:', JSON.stringify(tis[0], null, 2));
  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
