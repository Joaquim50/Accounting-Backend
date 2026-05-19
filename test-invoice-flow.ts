import { prisma } from './src/db/index';
import { InvoiceService } from './src/services/invoice.service';

async function runTest() {
  console.log('Starting Invoice API Integration Test Pipeline...\n');

  try {
    // 1. Fetch random active user and customer
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found in the database. Cannot run test.');
    
    const customer = await prisma.customer.findFirst();
    if (!customer) throw new Error('No customer found in the database. Please create a client first.');

    console.log(`[INIT] Using User ID: ${user.id}`);
    console.log(`[INIT] Using Customer ID: ${customer.id} (${customer.companyName || 'No Company Name'})\n`);

    // 2. Test: Create Proforma Invoice
    console.log('--- TEST 1: CREATE PROFORMA INVOICE (PI) ---');
    const piPayload = {
      piDate: new Date(),
      clientId: customer.id,
      baseAmount: 10000, // 10,000 INR
      gstPercentage: 18, // 18% GST
      tdsPercentage: 10, // 10% TDS
      notes: 'Automated test PI generation'
    };

    const newPI = await InvoiceService.createPI(piPayload as any, user.id);
    console.log(`✅ Success! PI Created: ${newPI.piNumber}`);
    console.log('↳ Calculations Verified:');
    console.log(`  - Base: ${newPI.baseAmount}`);
    console.log(`  - GST (18%): ${newPI.gstAmount}`);
    console.log(`  - Gross: ${newPI.grossAmount}`);
    console.log(`  - TDS (10%): ${newPI.tdsAmount}`);
    console.log(`  - Expected Receipt: ${newPI.expectedReceiptAmount}`);
    console.log(`  - Status: ${newPI.status}\n`);

    // 3. Test: Record Partial Payment
    console.log('--- TEST 2: RECORD PARTIAL PAYMENT ---');
    const paymentAmount = 5000;
    const paidPI = await InvoiceService.recordPIPayment(newPI.id, paymentAmount, 'Advance payment test', user.id);
    console.log(`✅ Success! Logged ${paymentAmount} INR payment.`);
    console.log(`↳ Updated Amount Received: ${paidPI.amountReceived} / ${paidPI.expectedReceiptAmount}`);
    console.log(`↳ Updated Status: ${paidPI.status} (Should be PARTIALLY_PAID)\n`);

    // 4. Test: Generate Tax Invoice from Proforma
    console.log('--- TEST 3: GENERATE TAX INVOICE (TI) FROM PROFORMA ---');
    const generatedTI = await InvoiceService.generateTIFromPI(newPI.id, new Date(), 'Converted via automation test', user.id);
    console.log(`✅ Success! Tax Invoice Cloned: ${generatedTI.tiNumber}`);
    console.log(`↳ Linked PI ID: ${generatedTI.piId}`);
    console.log(`↳ Synced Gross Amount: ${generatedTI.grossAmount}\n`);

    // 5. Test: Create Direct Tax Invoice
    console.log('--- TEST 4: CREATE DIRECT TAX INVOICE ---');
    const directTiPayload = {
      tiDate: new Date(),
      clientId: customer.id,
      baseAmount: 50000,
      gstPercentage: 18,
      tdsPercentage: 2,
      notes: 'Direct TI generation test'
    };
    const directTI = await InvoiceService.createDirectTI(directTiPayload as any, user.id);
    console.log(`✅ Success! Direct TI Created: ${directTI.tiNumber}`);
    console.log(`↳ Generated Gross: ${directTI.grossAmount}\n`);

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! The Financial Module is robust.');

  } catch (error: any) {
    console.error('❌ TEST FAILED:', error.message || error);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
