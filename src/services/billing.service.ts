import { prisma } from '../db';
import { Prisma } from '@prisma/client';

export interface BillingTrackerRow {
  id: string;
  sourceType: 'MILESTONE' | 'AMC_CYCLE' | 'PROJECT';
  customerId: string;
  customerName: string;
  projectId: string | null;
  projectOrAmcName: string;
  milestoneOrCycleName: string;
  billingType: string;
  baseAmount: number;
  gstAmount: number;
  grossAmount: number;
  tdsAmount: number;
  expectedAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  piNumber: string | null;
  piStatus: string;
  tiNumber: string | null;
  tiStatus: string;
  paymentStatus: string;
  dueDate: Date | null;
  remarks: string | null;
  createdAt: Date;
}

export class BillingService {
  /**
   * Main aggregation engine.
   * Fetches data from Milestones, AMC Cycles, and Standalone Projects.
   */
  static async getConsolidatedBillingData(filters: any): Promise<BillingTrackerRow[]> {
    const { customerId, projectId, startDate, endDate } = filters;

    const rows: BillingTrackerRow[] = [];

    // --- 1. Fetch Milestones ---
    const milestoneWhere: any = {};
    if (customerId) milestoneWhere.projectedSale = { customerId };
    if (projectId) milestoneWhere.projectedSaleId = projectId;
    if (startDate || endDate) {
      milestoneWhere.dueDate = {};
      if (startDate) milestoneWhere.dueDate.gte = new Date(startDate);
      if (endDate) milestoneWhere.dueDate.lte = new Date(endDate);
    }

    const milestones = await prisma.projectedSaleMilestone.findMany({
      where: milestoneWhere,
      include: {
        projectedSale: {
          include: { customer: true },
        },
        proformaInvoices: { orderBy: { createdAt: 'desc' }, take: 1 },
        taxInvoices: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    for (const m of milestones) {
      const pi = m.proformaInvoices[0];
      const ti = m.taxInvoices[0];
      const expected = Number(m.amount) || 0; // Assuming amount is expected receipt
      const received = pi ? Number(pi.amountReceived) : 0;
      const outstanding = expected - received;
      const isShortfall = outstanding > 0 && new Date() > m.dueDate && received > 0;
      let paymentStatus = m.status === 'PAID' ? 'Paid' : (received > 0 ? (isShortfall ? 'Shortfall' : 'Partial') : 'Pending');
      if (received >= expected && expected > 0) paymentStatus = 'Matched';

      rows.push({
        id: m.id,
        sourceType: 'MILESTONE',
        customerId: m.projectedSale.customerId,
        customerName: m.projectedSale.customer.companyName || m.projectedSale.customer.contactPerson,
        projectId: m.projectedSaleId,
        projectOrAmcName: m.projectedSale.projectName,
        milestoneOrCycleName: m.milestoneName,
        billingType: m.projectedSale.billingType,
        baseAmount: Number(pi?.baseAmount || 0), // Use PI base amount if exists, else estimate
        gstAmount: Number(pi?.gstAmount || 0),
        grossAmount: Number(pi?.grossAmount || 0),
        tdsAmount: Number(pi?.tdsAmount || 0),
        expectedAmount: expected,
        receivedAmount: received,
        outstandingAmount: outstanding,
        piNumber: pi?.piNumber || null,
        piStatus: pi?.status || 'Not Raised',
        tiNumber: ti?.tiNumber || null,
        tiStatus: ti?.status || 'Not Created',
        paymentStatus,
        dueDate: m.dueDate,
        remarks: pi?.notes || null,
        createdAt: m.createdAt,
      });
    }

    // --- 2. Fetch AMC Cycles ---
    const amcWhere: any = {};
    if (customerId) amcWhere.amc = { customerId };
    if (projectId) amcWhere.amcId = projectId;
    if (startDate || endDate) {
      amcWhere.dueDate = {};
      if (startDate) amcWhere.dueDate.gte = new Date(startDate);
      if (endDate) amcWhere.dueDate.lte = new Date(endDate);
    }

    const amcCycles = await prisma.amcBillingCycle.findMany({
      where: amcWhere,
      include: {
        amc: {
          include: { customer: true },
        },
      },
    });

    for (const cycle of amcCycles) {
      const expected = Number(cycle.expectedAmount);
      const received = Number(cycle.receivedAmount);
      const outstanding = expected - received;
      const isShortfall = outstanding > 0 && new Date() > cycle.dueDate && received > 0;
      let paymentStatus = cycle.paymentStatus as string;
      if (isShortfall && paymentStatus !== 'MATCHED') paymentStatus = 'SHORTFALL';

      rows.push({
        id: cycle.id,
        sourceType: 'AMC_CYCLE',
        customerId: cycle.amc.customerId,
        customerName: cycle.amc.customer.companyName || cycle.amc.customer.contactPerson,
        projectId: cycle.amcId,
        projectOrAmcName: cycle.amc.amcName,
        milestoneOrCycleName: cycle.cycleName,
        billingType: 'AMC',
        baseAmount: Number(cycle.baseAmount),
        gstAmount: Number(cycle.gstAmount),
        grossAmount: Number(cycle.grossAmount),
        tdsAmount: Number(cycle.tdsAmount),
        expectedAmount: expected,
        receivedAmount: received,
        outstandingAmount: outstanding,
        piNumber: null, // AMC uses piStatus directly unless linked to PI table in future
        piStatus: cycle.piStatus,
        tiNumber: null,
        tiStatus: cycle.tiStatus,
        paymentStatus,
        dueDate: cycle.dueDate,
        remarks: cycle.remarks,
        createdAt: cycle.createdAt,
      });
    }

    // --- 3. Fetch Standalone Projects (One-time / Retainer with no milestones) ---
    const projectWhere: any = {
      billingType: { in: ['ONE_TIME', 'MONTHLY_RETAINER'] },
      milestones: { none: {} }
    };
    if (customerId) projectWhere.customerId = customerId;
    if (projectId) projectWhere.id = projectId;
    if (startDate || endDate) {
      projectWhere.startDate = {};
      if (startDate) projectWhere.startDate.gte = new Date(startDate);
      if (endDate) projectWhere.startDate.lte = new Date(endDate);
    }

    const projects = await prisma.projectedSale.findMany({
      where: projectWhere,
      include: {
        customer: true,
        proformaInvoices: { orderBy: { createdAt: 'desc' }, take: 1 },
        taxInvoices: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    for (const p of projects) {
      const pi = p.proformaInvoices[0];
      const ti = p.taxInvoices[0];
      const expected = Number(p.finalAmount);
      const received = pi ? Number(pi.amountReceived) : 0;
      const outstanding = expected - received;
      const isShortfall = outstanding > 0 && new Date() > p.endDate && received > 0;
      let paymentStatus = received > 0 ? (isShortfall ? 'Shortfall' : 'Partial') : 'Pending';
      if (received >= expected && expected > 0) paymentStatus = 'Matched';

      rows.push({
        id: p.id,
        sourceType: 'PROJECT',
        customerId: p.customerId,
        customerName: p.customer.companyName || p.customer.contactPerson,
        projectId: p.id,
        projectOrAmcName: p.projectName,
        milestoneOrCycleName: 'Full Project',
        billingType: p.billingType,
        baseAmount: Number(pi?.baseAmount || p.totalValue),
        gstAmount: Number(pi?.gstAmount || p.gstAmount),
        grossAmount: Number(pi?.grossAmount || (Number(p.totalValue) + Number(p.gstAmount))),
        tdsAmount: Number(pi?.tdsAmount || p.tdsAmount),
        expectedAmount: expected,
        receivedAmount: received,
        outstandingAmount: outstanding,
        piNumber: pi?.piNumber || null,
        piStatus: pi?.status || 'Not Raised',
        tiNumber: ti?.tiNumber || null,
        tiStatus: ti?.status || 'Not Created',
        paymentStatus,
        dueDate: p.endDate,
        remarks: pi?.notes || p.notes,
        createdAt: p.createdAt,
      });
    }

    return rows;
  }

  /**
   * Applies JS-level filters, search, sorting and pagination.
   */
  static async getBillingTracker(filters: any) {
    const rawData = await this.getConsolidatedBillingData(filters);

    // Apply secondary filters
    let filteredData = rawData.filter(row => {
      let keep = true;
      if (filters.billingType && row.billingType !== filters.billingType) keep = false;
      if (filters.paymentStatus && row.paymentStatus.toUpperCase() !== filters.paymentStatus.toUpperCase()) keep = false;
      if (filters.piStatus && row.piStatus.toUpperCase() !== filters.piStatus.toUpperCase()) keep = false;
      if (filters.tiStatus && row.tiStatus.toUpperCase() !== filters.tiStatus.toUpperCase()) keep = false;
      
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matchesSearch = 
          row.customerName.toLowerCase().includes(term) ||
          row.projectOrAmcName.toLowerCase().includes(term) ||
          row.milestoneOrCycleName.toLowerCase().includes(term) ||
          row.piNumber?.toLowerCase().includes(term) ||
          row.tiNumber?.toLowerCase().includes(term);
        if (!matchesSearch) keep = false;
      }
      return keep;
    });

    // Sort by due date desc
    filteredData.sort((a, b) => {
      const dateA = a.dueDate ? a.dueDate.getTime() : 0;
      const dateB = b.dueDate ? b.dueDate.getTime() : 0;
      return dateB - dateA;
    });

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const totalCount = filteredData.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedData = filteredData.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedData,
      pagination: {
        totalItems: totalCount,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  /**
   * Returns Dashboard Summary Cards
   */
  static async getDashboardSummary(filters: any) {
    const allRows = await this.getConsolidatedBillingData(filters);

    let totalBillingValue = 0;
    let totalPIRaised = 0;
    let totalTaxInvoices = 0;
    let totalReceived = 0;
    let outstandingBeyondTDS = 0;
    let shortfallCasesCount = 0;

    for (const row of allRows) {
      totalBillingValue += row.grossAmount;
      if (row.piNumber) totalPIRaised++;
      if (row.tiNumber) totalTaxInvoices++;
      totalReceived += row.receivedAmount;
      outstandingBeyondTDS += row.outstandingAmount;
      
      if (row.paymentStatus.toUpperCase() === 'SHORTFALL') {
        shortfallCasesCount++;
      }
    }

    return {
      totalBillingValue,
      totalPIRaised,
      totalTaxInvoices,
      totalReceivedAmount: totalReceived,
      outstandingBeyondTDS,
      shortfallCasesCount,
    };
  }

  static async getRowDetails(id: string, sourceType: string) {
    if (sourceType === 'MILESTONE') {
      return await prisma.projectedSaleMilestone.findUnique({ where: { id }, include: { projectedSale: true, proformaInvoices: true, taxInvoices: true } });
    } else if (sourceType === 'AMC_CYCLE') {
      return await prisma.amcBillingCycle.findUnique({ where: { id }, include: { amc: true } });
    } else {
      return await prisma.projectedSale.findUnique({ where: { id }, include: { proformaInvoices: true, taxInvoices: true } });
    }
  }
}
