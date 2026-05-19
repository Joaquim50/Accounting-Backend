"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./db");
const amc_service_1 = require("./services/amc.service");
const client_1 = require("@prisma/client");
async function runTests() {
    console.log('🏁 Starting AMC Tracker End-to-End Service Tests...');
    // 1. Get or Bootstrap Customer
    let customer = await db_1.prisma.customer.findFirst({
        where: { deletedAt: null }
    });
    if (!customer) {
        console.log('ℹ️ No customer found. Creating mock Customer...');
        customer = await db_1.prisma.customer.create({
            data: {
                companyName: 'Test Tech Corporations Pvt Ltd',
                contactPerson: 'Alex Carter',
                phoneNumber: '+919999888877',
                email: 'alex@testtech.com',
                ccEmails: ['info@testtech.com'],
                addressLine1: '404 Web Dev Boulevard',
                country: 'India',
                state: 'Maharashtra',
                city: 'Mumbai',
                pincode: '400001',
                gstApplicable: true,
                gstinNumber: '27AAAAA1111A1Z1',
                tdsApplicable: true,
                tdsPercentage: 10,
            }
        });
    }
    console.log(`👤 Active Customer for Tests: "${customer.companyName}" (${customer.id})`);
    // 2. Create User/Auditor mockup
    let user = await db_1.prisma.user.findFirst();
    if (!user) {
        throw new Error('Please run the seed script first: no users exist in the database.');
    }
    const testUserId = user.id;
    // 3. Test API 1: Create AMC (Auto generates cycles)
    console.log('\n--- 🧪 TEST 1: Create AMC and Generate Billing Schedule ---');
    const createPayload = {
        customerId: customer.id,
        amcName: 'E2E Cloud Architecture SLA Maintenance',
        startDate: '2026-06-01',
        endDate: '2027-05-31', // 12 Months
        billingFrequency: client_1.AMCBillingFrequency.QUARTERLY, // Should produce exactly 4 cycles
        baseAmountPerCycle: 100000.00, // 1 Lakh
        gstPercentage: 18,
        tdsPercentage: 10,
        notes: 'Premium high priority cloud backup service test.'
    };
    const newAmc = await amc_service_1.AMCService.createAMC(createPayload, testUserId);
    if (!newAmc)
        throw new Error('Create AMC returned null!');
    console.log('✅ Created AMC successfully!');
    console.log(`   - AMC Name: "${newAmc.amcName}"`);
    console.log(`   - Base Amount per Cycle: ₹${newAmc.baseAmountPerCycle}`);
    console.log(`   - Auto GST Amount: ₹${newAmc.gstAmount} (Expected: ₹18000.00)`);
    console.log(`   - Auto TDS Amount: ₹${newAmc.tdsAmount} (Expected: ₹10000.00)`);
    console.log(`   - Gross Amount: ₹${newAmc.grossAmount} (Expected: ₹118000.00)`);
    console.log(`   - Expected Amount (Receivables): ₹${newAmc.expectedAmount} (Expected: ₹108000.00)`);
    console.log(`   - Billing Cycles Generated: ${newAmc.billingCycles.length} (Expected: 4)`);
    if (newAmc.billingCycles.length !== 4) {
        throw new Error(`Invalid billing cycles generated. Expected 4, got ${newAmc.billingCycles.length}`);
    }
    // 4. Test API 2: Update AMC (Updates and regenerates unpaid cycles)
    console.log('\n--- 🧪 TEST 2: Update AMC Base Value and Notes ---');
    const updatePayload = {
        amcName: 'E2E Cloud Architecture SLA Maintenance (Modified)',
        baseAmountPerCycle: 120000.00, // Base price increased
        notes: 'Added database hot-standby nodes replication checks.'
    };
    const updatedAmc = await amc_service_1.AMCService.updateAMC(newAmc.id, updatePayload, testUserId);
    if (!updatedAmc)
        throw new Error('Update AMC returned null!');
    console.log('✅ Updated AMC successfully!');
    console.log(`   - Updated Name: "${updatedAmc.amcName}"`);
    console.log(`   - New Expected Amount per Cycle: ₹${updatedAmc.expectedAmount} (Expected: ₹129600.00)`);
    console.log(`   - Refreshed Cycles Expected Amount: ₹${updatedAmc.billingCycles[0].expectedAmount} (Expected: ₹129600.00)`);
    // 5. Test API 3: Log Cycle Payment (Update Payment Statuses)
    console.log('\n--- 🧪 TEST 3: Log Billing Cycle Partial & Full Payments ---');
    const firstCycle = updatedAmc.billingCycles[0];
    // Log partial payment
    console.log('👉 Logging partial payment of ₹50,000 on Cycle 1...');
    const partialCycle = await amc_service_1.AMCService.updateBillingCyclePayment(firstCycle.id, {
        receivedAmount: 50000.00,
        remarks: 'NEFT token advance'
    }, testUserId);
    if (!partialCycle)
        throw new Error('Partial cycle update returned null');
    console.log(`   - Payment Status: ${partialCycle.paymentStatus} (Expected: PARTIAL)`);
    console.log(`   - Received Amount: ₹${partialCycle.receivedAmount}`);
    console.log(`   - Outstanding Amount: ₹${partialCycle.outstandingAmount} (Expected: ₹79600.00)`);
    // Log full payment
    console.log('👉 Logging remaining payment of ₹129,600 (full) on Cycle 1...');
    const fullyPaidCycle = await amc_service_1.AMCService.updateBillingCyclePayment(firstCycle.id, {
        receivedAmount: 129600.00,
        remarks: 'Balance settled'
    }, testUserId);
    if (!fullyPaidCycle)
        throw new Error('Full cycle update returned null');
    console.log(`   - Payment Status: ${fullyPaidCycle.paymentStatus} (Expected: PAID)`);
    console.log(`   - Outstanding Amount: ₹${fullyPaidCycle.outstandingAmount} (Expected: ₹0.00)`);
    // 6. Test API 4: Invoice Upload Statuses & Reconciliation Match
    console.log('\n--- 🧪 TEST 4: Modify Invoicing States & Reconciliation Match ---');
    const secondCycle = updatedAmc.billingCycles[1];
    console.log('👉 Updating Cycle 2 Proforma & Tax Invoice states...');
    const invoicedCycle = await amc_service_1.AMCService.updatePiTiStatus(secondCycle.id, {
        piStatus: client_1.PIStatus.SENT,
        tiStatus: client_1.TIStatus.UPLOADED,
        remarks: 'PI emailed. TI registered on GST Portal.'
    }, testUserId);
    if (!invoicedCycle)
        throw new Error('PiTi update returned null');
    console.log(`   - PI Status: ${invoicedCycle.piStatus} (Expected: SENT)`);
    console.log(`   - TI Status: ${invoicedCycle.tiStatus} (Expected: UPLOADED)`);
    console.log('👉 Marking Cycle 2 payment as Matched...');
    const matchedCycle = await amc_service_1.AMCService.markPaymentMatched(secondCycle.id, client_1.PaymentMatchStatus.MATCHED, testUserId);
    if (!matchedCycle)
        throw new Error('Match payment returned null');
    console.log(`   - Payment Match Status: ${matchedCycle.paymentMatchStatus} (Expected: MATCHED)`);
    // 7. Test API 5: Get Upcoming & Overdue Analytics
    console.log('\n--- 🧪 TEST 5: Get Upcoming & Overdue Billing Analytics ---');
    const upcoming = await amc_service_1.AMCService.getUpcomingBillingCycles();
    console.log(`✅ Fetched Upcoming Cycles count: ${upcoming.length} (Unpaid & Future cycles)`);
    const overdue = await amc_service_1.AMCService.getOverduePayments();
    console.log(`✅ Fetched Overdue Payments count: ${overdue.length} (Unpaid & Past cycles)`);
    // 8. Test API 6: Soft-Delete Contract
    console.log('\n--- 🧪 TEST 6: Soft Delete Contract and Audit States ---');
    const deletionResult = await amc_service_1.AMCService.deleteAMC(updatedAmc.id, false);
    if (!deletionResult || deletionResult.type !== 'SOFT') {
        throw new Error('Soft deletion failed');
    }
    const deletedRecord = await db_1.prisma.amc.findUnique({
        where: { id: updatedAmc.id }
    });
    console.log('✅ Soft-Deleted AMC successfully!');
    console.log(`   - deletedAt Timestamp: ${deletedRecord?.deletedAt}`);
    console.log(`   - Contract Status: ${deletedRecord?.status} (Expected: CANCELLED)`);
    // 9. Clean up Database (Hard Delete the Test AMC)
    console.log('\n--- 🧪 CLEANUP: Permanently purging test AMC from db ---');
    await amc_service_1.AMCService.deleteAMC(updatedAmc.id, true);
    console.log('✅ Purged test records successfully. Database is pristine! ✨');
    console.log('\n🎉 ALL END-TO-END AMC TRACKER TESTS PASSED SUCCESSFULLY! 🎉\n');
}
runTests().catch((error) => {
    console.error('\n❌ E2E TEST FAILED:', error);
    process.exit(1);
});
