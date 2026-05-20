"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const client_1 = require("@prisma/client");
class InvoiceService {
    // ==========================================
    // Core Utility & Calculation Methods
    // ==========================================
    static getFinancialYearInfo(date) {
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
        const tiFyString = `${startYearShort}${endYearShort}`; // e.g. 2526
        return { piFyString, tiFyString };
    }
    static async generatePINumber(piDate) {
        const { piFyString } = this.getFinancialYearInfo(piDate);
        const prefix = `PI/${piFyString}/`;
        const lastPI = await db_1.prisma.proformaInvoice.findFirst({
            where: { piNumber: { startsWith: prefix } },
            orderBy: { piNumber: 'desc' }
        });
        let nextNum = 1;
        if (lastPI) {
            const parts = lastPI.piNumber.split('/');
            const lastNum = parseInt(parts[2], 10);
            if (!isNaN(lastNum))
                nextNum = lastNum + 1;
        }
        return `${prefix}${String(nextNum).padStart(3, '0')}`;
    }
    static async generateTINumber(tiDate) {
        const { tiFyString } = this.getFinancialYearInfo(tiDate);
        const prefix = `MIPL/${tiFyString}/`;
        const lastTI = await db_1.prisma.taxInvoice.findFirst({
            where: { tiNumber: { startsWith: prefix } },
            orderBy: { tiNumber: 'desc' }
        });
        let nextNum = 1;
        if (lastTI) {
            const parts = lastTI.tiNumber.split('/');
            const lastNum = parseInt(parts[2], 10);
            if (!isNaN(lastNum))
                nextNum = lastNum + 1;
        }
        return `${prefix}${String(nextNum).padStart(3, '0')}`;
    }
    static calculateFinancials(baseAmount, gstPercentage, tdsPercentage) {
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
    static determinePIStatus(expected, received, currentStatus) {
        // Prevent overriding manual terminal states like CANCELLED or SHORTFALL automatically
        if (currentStatus === client_1.ProformaInvoiceStatus.CANCELLED || currentStatus === client_1.ProformaInvoiceStatus.SHORTFALL) {
            return currentStatus;
        }
        if (received >= expected)
            return client_1.ProformaInvoiceStatus.PAID;
        if (received > 0)
            return client_1.ProformaInvoiceStatus.PARTIALLY_PAID;
        return client_1.ProformaInvoiceStatus.PENDING;
    }
    // ==========================================
    // Proforma Invoice (PI) Operations
    // ==========================================
    static async createPI(data, userId) {
        const piDateObj = new Date(data.piDate);
        const piNumber = await this.generatePINumber(piDateObj);
        const financials = this.calculateFinancials(data.baseAmount, data.gstPercentage, data.tdsPercentage);
        // Auto-fetch milestone data if linked, though we rely on provided baseAmount for absolute flexibility
        if (data.milestoneId && !data.projectId) {
            const ms = await db_1.prisma.projectedSaleMilestone.findUnique({ where: { id: data.milestoneId } });
            if (ms)
                data.projectId = ms.projectedSaleId;
        }
        return await db_1.prisma.proformaInvoice.create({
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
    static async updatePI(id, data, userId) {
        const existing = await db_1.prisma.proformaInvoice.findUnique({ where: { id } });
        if (!existing)
            throw new Error('Proforma Invoice not found');
        const baseAmount = data.baseAmount !== undefined ? data.baseAmount : existing.baseAmount;
        const gstPct = data.gstPercentage !== undefined ? data.gstPercentage : existing.gstPercentage;
        const tdsPct = data.tdsPercentage !== undefined ? data.tdsPercentage : existing.tdsPercentage;
        const financials = this.calculateFinancials(Number(baseAmount), Number(gstPct), Number(tdsPct));
        const newExpected = financials.expectedReceiptAmount;
        const currentReceived = data.amountReceived !== undefined ? Number(data.amountReceived) : Number(existing.amountReceived);
        const newOutstanding = Number((newExpected - currentReceived).toFixed(2));
        let inputStatus = existing.status;
        if (data.status) {
            const upper = String(data.status).toUpperCase();
            if (upper === 'PENDING')
                inputStatus = client_1.ProformaInvoiceStatus.PENDING;
            else if (upper === 'PAID')
                inputStatus = client_1.ProformaInvoiceStatus.PAID;
            else if (upper === 'SHORTFALL')
                inputStatus = client_1.ProformaInvoiceStatus.SHORTFALL;
            else if (upper === 'CANCELLED')
                inputStatus = client_1.ProformaInvoiceStatus.CANCELLED;
            else if (upper === 'PARTIALLY_PAID' || upper === 'PARTIAL')
                inputStatus = client_1.ProformaInvoiceStatus.PARTIALLY_PAID;
            else if (upper === 'DRAFT')
                inputStatus = client_1.ProformaInvoiceStatus.DRAFT;
            else if (upper === 'SENT')
                inputStatus = client_1.ProformaInvoiceStatus.SENT;
        }
        const newStatus = this.determinePIStatus(newExpected, currentReceived, inputStatus);
        return await db_1.prisma.proformaInvoice.update({
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
    static async deletePI(id, hard = false) {
        if (hard) {
            return await db_1.prisma.proformaInvoice.delete({ where: { id } });
        }
        else {
            return await db_1.prisma.proformaInvoice.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    status: client_1.ProformaInvoiceStatus.CANCELLED
                }
            });
        }
    }
    static async getPIById(id) {
        return await db_1.prisma.proformaInvoice.findUnique({
            where: { id },
            include: {
                customer: true,
                projectedSale: true,
                milestone: true,
                taxInvoice: true,
            }
        });
    }
    static async getPIs(options) {
        const { page = 1, limit = 10, search, clientId, projectId, status, startDate, endDate, paymentStatus } = options;
        const skip = (page - 1) * limit;
        const where = { deletedAt: null };
        if (search) {
            where.OR = [
                { piNumber: { contains: search, mode: 'insensitive' } },
                { customer: { companyName: { contains: search, mode: 'insensitive' } } },
                { projectedSale: { projectName: { contains: search, mode: 'insensitive' } } }
            ];
        }
        if (clientId)
            where.clientId = clientId;
        if (projectId)
            where.projectId = projectId;
        if (status)
            where.status = status;
        if (startDate && endDate) {
            where.piDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        if (paymentStatus) {
            if (paymentStatus === 'PENDING')
                where.status = client_1.ProformaInvoiceStatus.PENDING;
            if (paymentStatus === 'PARTIALLY_PAID')
                where.status = client_1.ProformaInvoiceStatus.PARTIALLY_PAID;
            if (paymentStatus === 'PAID')
                where.status = client_1.ProformaInvoiceStatus.PAID;
        }
        const [totalCount, invoices] = await db_1.prisma.$transaction([
            db_1.prisma.proformaInvoice.count({ where }),
            db_1.prisma.proformaInvoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: { select: { id: true, companyName: true, contactPerson: true } },
                    projectedSale: { select: { id: true, projectName: true, projectType: true } },
                    milestone: { select: { id: true, milestoneName: true, percentage: true } }
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
    static async updatePIStatus(id, status, userId) {
        return await db_1.prisma.proformaInvoice.update({
            where: { id },
            data: { status, updatedBy: userId }
        });
    }
    static async uploadPIFile(id, filePath, userId) {
        const existing = await db_1.prisma.proformaInvoice.findUnique({ where: { id } });
        if (existing?.piFile) {
            const oldPath = path_1.default.join(process.cwd(), existing.piFile);
            if (fs_1.default.existsSync(oldPath))
                fs_1.default.unlinkSync(oldPath);
        }
        return await db_1.prisma.proformaInvoice.update({
            where: { id },
            data: { piFile: filePath, updatedBy: userId }
        });
    }
    static async deletePIFile(id, userId) {
        const existing = await db_1.prisma.proformaInvoice.findUnique({ where: { id } });
        if (existing?.piFile) {
            const oldPath = path_1.default.join(process.cwd(), existing.piFile);
            if (fs_1.default.existsSync(oldPath))
                fs_1.default.unlinkSync(oldPath);
        }
        return await db_1.prisma.proformaInvoice.update({
            where: { id },
            data: { piFile: null, updatedBy: userId }
        });
    }
    static async recordPIPayment(id, receivedAmount, remarks, userId) {
        const existing = await db_1.prisma.proformaInvoice.findUnique({ where: { id } });
        if (!existing)
            throw new Error('Proforma Invoice not found');
        const expected = Number(existing.expectedReceiptAmount);
        // Keep running total if required, but typically this is cumulative update. 
        // Here we assume receivedAmount passed is the NEW cumulative total.
        const newOutstanding = Number((expected - receivedAmount).toFixed(2));
        const newStatus = this.determinePIStatus(expected, receivedAmount, existing.status);
        return await db_1.prisma.proformaInvoice.update({
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
    static async getOutstandingPIs() {
        return await db_1.prisma.proformaInvoice.findMany({
            where: {
                deletedAt: null,
                outstandingAmount: { gt: 0 },
                status: { notIn: [client_1.ProformaInvoiceStatus.CANCELLED, client_1.ProformaInvoiceStatus.DRAFT] }
            },
            include: { customer: { select: { companyName: true } } },
            orderBy: { piDate: 'asc' }
        });
    }
    static async getShortfallPIs() {
        return await db_1.prisma.proformaInvoice.findMany({
            where: { deletedAt: null, status: client_1.ProformaInvoiceStatus.SHORTFALL },
            include: { customer: { select: { companyName: true } } },
            orderBy: { piDate: 'desc' }
        });
    }
    // ==========================================
    // Tax Invoice (TI) Operations
    // ==========================================
    static async generateTIFromPI(piId, tiDate, notes, userId) {
        const pi = await db_1.prisma.proformaInvoice.findUnique({ where: { id: piId } });
        if (!pi)
            throw new Error('Source Proforma Invoice not found');
        const existingTI = await db_1.prisma.taxInvoice.findFirst({
            where: { piId, status: { not: client_1.TaxInvoiceStatus.CANCELLED }, deletedAt: null }
        });
        if (existingTI)
            throw new Error(`Active Tax Invoice already exists for this PI: ${existingTI.tiNumber}`);
        const tiNumber = await this.generateTINumber(tiDate);
        // Run within transaction to ensure data integrity
        return await db_1.prisma.$transaction(async (tx) => {
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
                    status: client_1.TaxInvoiceStatus.GENERATED,
                    notes: notes,
                    createdBy: userId,
                    updatedBy: userId,
                }
            });
            // Optionally, promote PI status if it was just Draft/Sent
            if (pi.status === client_1.ProformaInvoiceStatus.DRAFT) {
                await tx.proformaInvoice.update({
                    where: { id: pi.id },
                    data: { status: client_1.ProformaInvoiceStatus.SENT, updatedBy: userId }
                });
            }
            return newTI;
        });
    }
    static async createDirectTI(data, userId) {
        const tiDateObj = new Date(data.tiDate);
        const tiNumber = await this.generateTINumber(tiDateObj);
        const financials = this.calculateFinancials(data.baseAmount, data.gstPercentage, data.tdsPercentage);
        return await db_1.prisma.taxInvoice.create({
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
                status: client_1.TaxInvoiceStatus.DRAFT, // Direct TIs start as DRAFT
                notes: data.notes,
                createdBy: userId,
                updatedBy: userId,
            }
        });
    }
    static async updateTI(id, data, userId) {
        const existing = await db_1.prisma.taxInvoice.findUnique({ where: { id } });
        if (!existing)
            throw new Error('Tax Invoice not found');
        const baseAmount = data.baseAmount !== undefined ? data.baseAmount : existing.baseAmount;
        const gstPct = data.gstPercentage !== undefined ? data.gstPercentage : existing.gstPercentage;
        const tdsPct = data.tdsPercentage !== undefined ? data.tdsPercentage : existing.tdsPercentage;
        const financials = this.calculateFinancials(Number(baseAmount), Number(gstPct), Number(tdsPct));
        const newExpected = financials.expectedReceiptAmount;
        const currentReceived = data.amountReceived !== undefined ? Number(data.amountReceived) : Number(existing.amountReceived);
        const newOutstanding = Number((newExpected - currentReceived).toFixed(2));
        return await db_1.prisma.taxInvoice.update({
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
    static async deleteTI(id, hard = false) {
        if (hard) {
            return await db_1.prisma.taxInvoice.delete({ where: { id } });
        }
        else {
            return await db_1.prisma.taxInvoice.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    status: client_1.TaxInvoiceStatus.CANCELLED
                }
            });
        }
    }
    static async getTIById(id) {
        return await db_1.prisma.taxInvoice.findUnique({
            where: { id },
            include: {
                customer: true,
                projectedSale: true,
                milestone: true,
                proformaInvoice: true,
            }
        });
    }
    static async getTIs(options) {
        const { page = 1, limit = 10, search, clientId, projectId, status, startDate, endDate } = options;
        const skip = (page - 1) * limit;
        const where = { deletedAt: null };
        if (search) {
            where.OR = [
                { tiNumber: { contains: search, mode: 'insensitive' } },
                { customer: { companyName: { contains: search, mode: 'insensitive' } } },
                { projectedSale: { projectName: { contains: search, mode: 'insensitive' } } }
            ];
        }
        if (clientId)
            where.clientId = clientId;
        if (projectId)
            where.projectId = projectId;
        if (status)
            where.status = status;
        if (startDate && endDate) {
            where.tiDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const [totalCount, invoices] = await db_1.prisma.$transaction([
            db_1.prisma.taxInvoice.count({ where }),
            db_1.prisma.taxInvoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: { select: { id: true, companyName: true, contactPerson: true } },
                    projectedSale: { select: { id: true, projectName: true, projectType: true } },
                    milestone: { select: { id: true, milestoneName: true, percentage: true } }
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
    static async updateTIStatus(id, status, userId) {
        return await db_1.prisma.taxInvoice.update({
            where: { id },
            data: { status, updatedBy: userId }
        });
    }
    static async uploadTIFile(id, filePath, userId) {
        const existing = await db_1.prisma.taxInvoice.findUnique({ where: { id } });
        if (existing?.tiFile) {
            const oldPath = path_1.default.join(process.cwd(), existing.tiFile);
            if (fs_1.default.existsSync(oldPath))
                fs_1.default.unlinkSync(oldPath);
        }
        return await db_1.prisma.taxInvoice.update({
            where: { id },
            data: { tiFile: filePath, updatedBy: userId }
        });
    }
    static async deleteTIFile(id, userId) {
        const existing = await db_1.prisma.taxInvoice.findUnique({ where: { id } });
        if (existing?.tiFile) {
            const oldPath = path_1.default.join(process.cwd(), existing.tiFile);
            if (fs_1.default.existsSync(oldPath))
                fs_1.default.unlinkSync(oldPath);
        }
        return await db_1.prisma.taxInvoice.update({
            where: { id },
            data: { tiFile: null, updatedBy: userId }
        });
    }
}
exports.InvoiceService = InvoiceService;
