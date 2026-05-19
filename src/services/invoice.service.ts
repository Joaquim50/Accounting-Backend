import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { Prisma, ProformaInvoiceStatus, TaxInvoiceStatus } from '@prisma/client';

export interface InvoiceFilterOptions {
  search?: string;
  clientId?: string;
  projectId?: string;
  status?: ProformaInvoiceStatus | TaxInvoiceStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  paymentStatus?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
}

export class InvoiceService {
  // ==========================================
  // Core Utility & Calculation Methods
  // ==========================================

  private static getFinancialYearInfo(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    
    let startYear = year;
    let endYear = year + 1;
    
    // Financial year runs April (month 3) to March (month 2)
    if (month < 3) {
      startYear = year - 1;
      endYear = year;
    }
    
    const startYearShort = String(startYear).slice(-2);
    const endYearShort = String(endYear).slice(-2);
    
    const piFyString = `${startYearShort}-${endYearShort}`; // e.g. 26-27
    const tiFyString = `${startYearShort}${endYearShort}`;   // e.g. 2526
    
    return { piFyString, tiFyString };
  }

  private static async generatePINumber(piDate: Date): Promise<string> {
    const { piFyString } = this.getFinancialYearInfo(piDate);
    const prefix = `PI/${piFyString}/`;
    
    const lastPI = await prisma.proformaInvoice.findFirst({
      where: { piNumber: { startsWith: prefix } },
      orderBy: { piNumber: 'desc' }
    });
    
    let nextNum = 1;
    if (lastPI) {
      const parts = lastPI.piNumber.split('/');
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  }

  private static async generateTINumber(tiDate: Date): Promise<string> {
    const { tiFyString } = this.getFinancialYearInfo(tiDate);
    const prefix = `MIPL/${tiFyString}/`;
    
    const lastTI = await prisma.taxInvoice.findFirst({
      where: { tiNumber: { startsWith: prefix } },
      orderBy: { tiNumber: 'desc' }
    });
    
    let nextNum = 1;
    if (lastTI) {
      const parts = lastTI.tiNumber.split('/');
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  }

  private static calculateFinancials(baseAmount: number, gstPercentage: number, tdsPercentage: number) {
    const base = Number(baseAmount);
    const gstPct = Number(gstPercentage || 0);
    const tdsPct = Number(tdsPercentage || 0);

    const gstAmount = Number(((base * gstPct) / 100).toFixed(2));
    const tdsAmount = Number(((base * tdsPct) / 100).toFixed(2));
    const grossAmount = Number((base + gstAmount).toFixed(2));
    const expectedReceiptAmount = Number((grossAmount - tdsAmount).toFixed(2));

    return {
      gstAmount,
      tdsAmount,
      grossAmount,
      expectedReceiptAmount
    };
  }

  private static determinePIStatus(expected: number, received: number, currentStatus: ProformaInvoiceStatus): ProformaInvoiceStatus {
    // Prevent overriding manual terminal states like CANCELLED or SHORTFALL automatically
    if (currentStatus === ProformaInvoiceStatus.CANCELLED || currentStatus === ProformaInvoiceStatus.SHORTFALL) {
      return currentStatus;
    }
    if (received >= expected) return ProformaInvoiceStatus.PAID;
    if (received > 0) return ProformaInvoiceStatus.PARTIALLY_PAID;
    return ProformaInvoiceStatus.PENDING;
  }

  // ==========================================
  // Proforma Invoice (PI) Operations
  // ==========================================

  public static async createPI(data: any, userId: string) {
    const piDateObj = new Date(data.piDate);
    const piNumber = await this.generatePINumber(piDateObj);
    
    const financials = this.calculateFinancials(data.baseAmount, data.gstPercentage, data.tdsPercentage);
    
    // Auto-fetch milestone data if linked, though we rely on provided baseAmount for absolute flexibility
    if (data.milestoneId && !data.projectId) {
      const ms = await prisma.projectedSaleMilestone.findUnique({ where: { id: data.milestoneId } });
      if (ms) data.projectId = ms.projectedSaleId;
    }

    return await prisma.proformaInvoice.create({
      data: {
        piNumber,
        piDate: piDateObj,
        clientId: data.clientId,
        projectId: data.projectId,
        milestoneId: data.milestoneId,
        baseAmount: data.baseAmount,
        gstPercentage: data.gstPercentage,
        tdsPercentage: data.tdsPercentage,
        gstAmount: financials.gstAmount,
        tdsAmount: financials.tdsAmount,
        grossAmount: financials.grossAmount,
        expectedReceiptAmount: financials.expectedReceiptAmount,
        outstandingAmount: financials.expectedReceiptAmount, // Initially outstanding = expected
        notes: data.notes,
        createdBy: userId,
        updatedBy: userId,
      }
    });
  }

  public static async updatePI(id: string, data: any, userId: string) {
    const existing = await prisma.proformaInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('Proforma Invoice not found');

    const baseAmount = data.baseAmount !== undefined ? data.baseAmount : existing.baseAmount;
    const gstPct = data.gstPercentage !== undefined ? data.gstPercentage : existing.gstPercentage;
    const tdsPct = data.tdsPercentage !== undefined ? data.tdsPercentage : existing.tdsPercentage;

    const financials = this.calculateFinancials(Number(baseAmount), Number(gstPct), Number(tdsPct));
    
    const newExpected = financials.expectedReceiptAmount;
    const currentReceived = Number(existing.amountReceived);
    const newOutstanding = Number((newExpected - currentReceived).toFixed(2));
    
    const newStatus = this.determinePIStatus(newExpected, currentReceived, existing.status);

    return await prisma.proformaInvoice.update({
      where: { id },
      data: {
        ...data,
        piDate: data.piDate ? new Date(data.piDate) : undefined,
        gstAmount: financials.gstAmount,
        tdsAmount: financials.tdsAmount,
        grossAmount: financials.grossAmount,
        expectedReceiptAmount: newExpected,
        outstandingAmount: newOutstanding,
        status: newStatus,
        updatedBy: userId,
      }
    });
  }

  public static async deletePI(id: string, hard: boolean = false) {
    if (hard) {
      return await prisma.proformaInvoice.delete({ where: { id } });
    } else {
      return await prisma.proformaInvoice.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: ProformaInvoiceStatus.CANCELLED
        }
      });
    }
  }

  public static async getPIById(id: string) {
    return await prisma.proformaInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        projectedSale: true,
        milestone: true,
        taxInvoice: true,
      }
    });
  }

  public static async getPIs(options: InvoiceFilterOptions) {
    const { page = 1, limit = 10, search, clientId, projectId, status, startDate, endDate, paymentStatus } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ProformaInvoiceWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { piNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { projectedSale: { projectName: { contains: search, mode: 'insensitive' } } }
      ];
    }
    if (clientId) where.clientId = clientId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status as ProformaInvoiceStatus;
    if (startDate && endDate) {
      where.piDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (paymentStatus) {
      if (paymentStatus === 'PENDING') where.status = ProformaInvoiceStatus.PENDING;
      if (paymentStatus === 'PARTIALLY_PAID') where.status = ProformaInvoiceStatus.PARTIALLY_PAID;
      if (paymentStatus === 'PAID') where.status = ProformaInvoiceStatus.PAID;
    }

    const [totalCount, invoices] = await prisma.$transaction([
      prisma.proformaInvoice.count({ where }),
      prisma.proformaInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, companyName: true, contactPerson: true } },
          projectedSale: { select: { id: true, projectName: true } }
        }
      })
    ]);

    return {
      invoices,
      meta: {
        totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  public static async updatePIStatus(id: string, status: ProformaInvoiceStatus, userId: string) {
    return await prisma.proformaInvoice.update({
      where: { id },
      data: { status, updatedBy: userId }
    });
  }

  public static async uploadPIFile(id: string, filePath: string, userId: string) {
    const existing = await prisma.proformaInvoice.findUnique({ where: { id } });
    if (existing?.piFile) {
      const oldPath = path.join(process.cwd(), existing.piFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    return await prisma.proformaInvoice.update({
      where: { id },
      data: { piFile: filePath, updatedBy: userId }
    });
  }

  public static async deletePIFile(id: string, userId: string) {
    const existing = await prisma.proformaInvoice.findUnique({ where: { id } });
    if (existing?.piFile) {
      const oldPath = path.join(process.cwd(), existing.piFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    return await prisma.proformaInvoice.update({
      where: { id },
      data: { piFile: null, updatedBy: userId }
    });
  }

  public static async recordPIPayment(id: string, receivedAmount: number, remarks: string | null | undefined, userId: string) {
    const existing = await prisma.proformaInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('Proforma Invoice not found');

    const expected = Number(existing.expectedReceiptAmount);
    // Keep running total if required, but typically this is cumulative update. 
    // Here we assume receivedAmount passed is the NEW cumulative total.
    const newOutstanding = Number((expected - receivedAmount).toFixed(2));
    const newStatus = this.determinePIStatus(expected, receivedAmount, existing.status);

    return await prisma.proformaInvoice.update({
      where: { id },
      data: {
        amountReceived: receivedAmount,
        outstandingAmount: newOutstanding,
        status: newStatus,
        notes: remarks ? `${existing.notes ? existing.notes + '\n' : ''}Payment Note: ${remarks}` : existing.notes,
        updatedBy: userId
      }
    });
  }

  public static async getOutstandingPIs() {
    return await prisma.proformaInvoice.findMany({
      where: {
        deletedAt: null,
        outstandingAmount: { gt: 0 },
        status: { notIn: [ProformaInvoiceStatus.CANCELLED, ProformaInvoiceStatus.DRAFT] }
      },
      include: { customer: { select: { companyName: true } } },
      orderBy: { piDate: 'asc' }
    });
  }

  public static async getShortfallPIs() {
    return await prisma.proformaInvoice.findMany({
      where: { deletedAt: null, status: ProformaInvoiceStatus.SHORTFALL },
      include: { customer: { select: { companyName: true } } },
      orderBy: { piDate: 'desc' }
    });
  }

  // ==========================================
  // Tax Invoice (TI) Operations
  // ==========================================

  public static async generateTIFromPI(piId: string, tiDate: Date, notes: string | null | undefined, userId: string) {
    const pi = await prisma.proformaInvoice.findUnique({ where: { id: piId } });
    if (!pi) throw new Error('Source Proforma Invoice not found');

    const existingTI = await prisma.taxInvoice.findFirst({
      where: { piId, status: { not: TaxInvoiceStatus.CANCELLED }, deletedAt: null }
    });
    if (existingTI) throw new Error(`Active Tax Invoice already exists for this PI: ${existingTI.tiNumber}`);

    const tiNumber = await this.generateTINumber(tiDate);

    // Run within transaction to ensure data integrity
    return await prisma.$transaction(async (tx) => {
      const newTI = await tx.taxInvoice.create({
        data: {
          tiNumber,
          tiDate,
          piId,
          clientId: pi.clientId,
          projectId: pi.projectId,
          milestoneId: pi.milestoneId,
          baseAmount: pi.baseAmount,
          gstPercentage: pi.gstPercentage,
          gstAmount: pi.gstAmount,
          grossAmount: pi.grossAmount,
          tdsPercentage: pi.tdsPercentage,
          tdsAmount: pi.tdsAmount,
          expectedReceiptAmount: pi.expectedReceiptAmount,
          amountReceived: pi.amountReceived,
          outstandingAmount: pi.outstandingAmount,
          status: TaxInvoiceStatus.GENERATED,
          notes: notes,
          createdBy: userId,
          updatedBy: userId,
        }
      });

      // Optionally, promote PI status if it was just Draft/Sent
      if (pi.status === ProformaInvoiceStatus.DRAFT) {
        await tx.proformaInvoice.update({
          where: { id: pi.id },
          data: { status: ProformaInvoiceStatus.SENT, updatedBy: userId }
        });
      }

      return newTI;
    });
  }

  public static async createDirectTI(data: any, userId: string) {
    const tiDateObj = new Date(data.tiDate);
    const tiNumber = await this.generateTINumber(tiDateObj);
    
    const financials = this.calculateFinancials(data.baseAmount, data.gstPercentage, data.tdsPercentage);

    return await prisma.taxInvoice.create({
      data: {
        tiNumber,
        tiDate: tiDateObj,
        clientId: data.clientId,
        projectId: data.projectId,
        milestoneId: data.milestoneId,
        baseAmount: data.baseAmount,
        gstPercentage: data.gstPercentage,
        tdsPercentage: data.tdsPercentage,
        gstAmount: financials.gstAmount,
        tdsAmount: financials.tdsAmount,
        grossAmount: financials.grossAmount,
        expectedReceiptAmount: financials.expectedReceiptAmount,
        outstandingAmount: financials.expectedReceiptAmount,
        status: TaxInvoiceStatus.DRAFT, // Direct TIs start as DRAFT
        notes: data.notes,
        createdBy: userId,
        updatedBy: userId,
      }
    });
  }

  public static async updateTI(id: string, data: any, userId: string) {
    const existing = await prisma.taxInvoice.findUnique({ where: { id } });
    if (!existing) throw new Error('Tax Invoice not found');

    const baseAmount = data.baseAmount !== undefined ? data.baseAmount : existing.baseAmount;
    const gstPct = data.gstPercentage !== undefined ? data.gstPercentage : existing.gstPercentage;
    const tdsPct = data.tdsPercentage !== undefined ? data.tdsPercentage : existing.tdsPercentage;

    const financials = this.calculateFinancials(Number(baseAmount), Number(gstPct), Number(tdsPct));
    
    const newExpected = financials.expectedReceiptAmount;
    const currentReceived = Number(existing.amountReceived);
    const newOutstanding = Number((newExpected - currentReceived).toFixed(2));

    return await prisma.taxInvoice.update({
      where: { id },
      data: {
        ...data,
        tiDate: data.tiDate ? new Date(data.tiDate) : undefined,
        gstAmount: financials.gstAmount,
        tdsAmount: financials.tdsAmount,
        grossAmount: financials.grossAmount,
        expectedReceiptAmount: newExpected,
        outstandingAmount: newOutstanding,
        updatedBy: userId,
      }
    });
  }

  public static async deleteTI(id: string, hard: boolean = false) {
    if (hard) {
      return await prisma.taxInvoice.delete({ where: { id } });
    } else {
      return await prisma.taxInvoice.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: TaxInvoiceStatus.CANCELLED
        }
      });
    }
  }

  public static async getTIById(id: string) {
    return await prisma.taxInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        projectedSale: true,
        milestone: true,
        proformaInvoice: true,
      }
    });
  }

  public static async getTIs(options: InvoiceFilterOptions) {
    const { page = 1, limit = 10, search, clientId, projectId, status, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.TaxInvoiceWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { tiNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { projectedSale: { projectName: { contains: search, mode: 'insensitive' } } }
      ];
    }
    if (clientId) where.clientId = clientId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status as TaxInvoiceStatus;
    if (startDate && endDate) {
      where.tiDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [totalCount, invoices] = await prisma.$transaction([
      prisma.taxInvoice.count({ where }),
      prisma.taxInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, companyName: true, contactPerson: true } },
          projectedSale: { select: { id: true, projectName: true } }
        }
      })
    ]);

    return {
      invoices,
      meta: {
        totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  public static async updateTIStatus(id: string, status: TaxInvoiceStatus, userId: string) {
    return await prisma.taxInvoice.update({
      where: { id },
      data: { status, updatedBy: userId }
    });
  }

  public static async uploadTIFile(id: string, filePath: string, userId: string) {
    const existing = await prisma.taxInvoice.findUnique({ where: { id } });
    if (existing?.tiFile) {
      const oldPath = path.join(process.cwd(), existing.tiFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    return await prisma.taxInvoice.update({
      where: { id },
      data: { tiFile: filePath, updatedBy: userId }
    });
  }

  public static async deleteTIFile(id: string, userId: string) {
    const existing = await prisma.taxInvoice.findUnique({ where: { id } });
    if (existing?.tiFile) {
      const oldPath = path.join(process.cwd(), existing.tiFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    return await prisma.taxInvoice.update({
      where: { id },
      data: { tiFile: null, updatedBy: userId }
    });
  }
}
