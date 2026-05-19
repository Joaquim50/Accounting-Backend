import { BillingService } from './src/services/billing.service';

async function testBilling() {
  console.log('--- STARTING BILLING TRACKER TEST ---\n');

  try {
    console.log('1. Fetching Dashboard Summary Cards...');
    const summary = await BillingService.getDashboardSummary({});
    console.log('✅ Dashboard Summary:');
    console.log(JSON.stringify(summary, null, 2));
    console.log('\n-----------------------------------\n');

    console.log('2. Fetching Consolidated Tracker Table (No Filters)...');
    const tableData = await BillingService.getBillingTracker({});
    console.log(`✅ Table Retrieved - Total Items: ${tableData.pagination.totalItems}`);
    console.log(`✅ Showing first 2 items (out of ${tableData.data.length}):`);
    console.log(JSON.stringify(tableData.data.slice(0, 2), null, 2));
    console.log('\n-----------------------------------\n');

    console.log('🎉 BILLING API TEST SUCCESSFUL');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing Billing Tracker:', error);
    process.exit(1);
  }
}

testBilling();
