"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const db_1 = require("../db");
class PaymentService {
    // 1. Calculate and formulate financial fields dynamically with mutual exclusivity of deductions
    static calculateFinancials(data) {
        const base = Number(data.baseAmount);
        const paid = Number(data.paidAmount || 0);
        // Calculate GST
        let gstAmount = 0;
        if (data.gstApplicable && data.gstPercentage) {
            gstAmount = Number(((base * Number(data.gstPercentage)) / 100).toFixed(2));
        }
        // Calculate Deduction based strictly on active deductionType (exactly one selected)
        let deductionAmount = 0;
        if (data.deductionType === 'TDS' && data.deductionPercentageTDS) {
            deductionAmount = Number(((base * Number(data.deductionPercentageTDS)) / 100).toFixed(2));
        }
        else if (data.deductionType === 'PT' && data.ptAmountFixed) {
            deductionAmount = Number(Number(data.ptAmountFixed).toFixed(2));
        }
        else if (data.deductionType === 'OTHER' && data.deductionPercentageOther) {
            deductionAmount = Number(((base * Number(data.deductionPercentageOther)) / 100).toFixed(2));
        }
        // Calculate Net Payable and Balance
        const netPayable = Number((base + gstAmount - deductionAmount).toFixed(2));
        const balance = Number((netPayable - paid).toFixed(2));
        // Determine status
        let paymentStatus = 'PENDING';
        if (paid >= netPayable && netPayable > 0) {
            paymentStatus = 'PAID';
        }
        else if (paid > 0) {
            paymentStatus = 'PART_PAID';
        }
        return {
            gstAmount,
            deductionAmount,
            netPayable,
            balance,
            paymentStatus,
        };
    }
    // 2. Create Payment
    static async createPayment(data) {
        const calculated = this.calculateFinancials({
            baseAmount: data.baseAmount,
            gstApplicable: data.gstApplicable,
            gstPercentage: data.gstPercentage,
            deductionType: data.deductionType,
            deductionPercentageTDS: data.deductionPercentageTDS,
            ptAmountFixed: data.ptAmountFixed,
            deductionPercentageOther: data.deductionPercentageOther,
            paidAmount: data.paidAmount,
        });
        // Enforce mutual exclusivity at persistence level (exactly one select)
        let tds = null;
        let pt = null;
        let other = null;
        if (data.deductionType === 'TDS') {
            tds = data.deductionPercentageTDS;
        }
        else if (data.deductionType === 'PT') {
            pt = data.ptAmountFixed;
        }
        else if (data.deductionType === 'OTHER') {
            other = data.deductionPercentageOther;
        }
        return db_1.prisma.payment.create({
            data: {
                paymentFrequency: data.paymentFrequency,
                expenseDate: data.expenseDate,
                expenseType: data.expenseType,
                partyType: data.partyType,
                vendorId: data.vendorId || null,
                employeeId: data.employeeId || null,
                partyNameCustom: data.partyNameCustom || null,
                notes: data.notes || null,
                baseAmount: data.baseAmount,
                gstApplicable: data.gstApplicable,
                gstPercentage: data.gstApplicable ? (data.gstPercentage || null) : null,
                gstAmount: calculated.gstAmount,
                deductionType: data.deductionType,
                deductionPercentageTDS: tds,
                ptAmountFixed: pt,
                deductionPercentageOther: other,
                deductionAmount: calculated.deductionAmount,
                netPayable: calculated.netPayable,
                paidAmount: data.paidAmount || 0,
                balance: calculated.balance,
                paymentStatus: calculated.paymentStatus,
            },
            include: {
                vendor: {
                    select: { id: true, companyName: true, vendorName: true },
                },
                employee: {
                    select: { id: true, name: true },
                },
            },
        });
    }
    // 3. Update Payment
    static async updatePayment(id, data) {
        const existing = await db_1.prisma.payment.findUnique({
            where: { id, deletedAt: null },
        });
        if (!existing)
            return null;
        // Merge existing details with updates to recalculate accurately
        const merged = {
            baseAmount: data.baseAmount !== undefined ? data.baseAmount : Number(existing.baseAmount),
            gstApplicable: data.gstApplicable !== undefined ? data.gstApplicable : existing.gstApplicable,
            gstPercentage: data.gstPercentage !== undefined ? data.gstPercentage : (existing.gstPercentage ? Number(existing.gstPercentage) : null),
            deductionType: data.deductionType !== undefined ? data.deductionType : existing.deductionType,
            deductionPercentageTDS: data.deductionPercentageTDS !== undefined ? data.deductionPercentageTDS : (existing.deductionPercentageTDS ? Number(existing.deductionPercentageTDS) : null),
            ptAmountFixed: data.ptAmountFixed !== undefined ? data.ptAmountFixed : (existing.ptAmountFixed ? Number(existing.ptAmountFixed) : null),
            deductionPercentageOther: data.deductionPercentageOther !== undefined ? data.deductionPercentageOther : (existing.deductionPercentageOther ? Number(existing.deductionPercentageOther) : null),
            paidAmount: data.paidAmount !== undefined ? data.paidAmount : Number(existing.paidAmount),
        };
        const calculated = this.calculateFinancials(merged);
        // Apply mutual exclusivity on updates (clean up other deduction fields)
        let tds = null;
        let pt = null;
        let other = null;
        if (merged.deductionType === 'TDS') {
            tds = merged.deductionPercentageTDS;
        }
        else if (merged.deductionType === 'PT') {
            pt = merged.ptAmountFixed;
        }
        else if (merged.deductionType === 'OTHER') {
            other = merged.deductionPercentageOther;
        }
        return db_1.prisma.payment.update({
            where: { id },
            data: {
                paymentFrequency: data.paymentFrequency !== undefined ? data.paymentFrequency : existing.paymentFrequency,
                expenseDate: data.expenseDate !== undefined ? data.expenseDate : existing.expenseDate,
                expenseType: data.expenseType !== undefined ? data.expenseType : existing.expenseType,
                partyType: data.partyType !== undefined ? data.partyType : existing.partyType,
                vendorId: data.vendorId !== undefined ? data.vendorId : existing.vendorId,
                employeeId: data.employeeId !== undefined ? data.employeeId : existing.employeeId,
                partyNameCustom: data.partyNameCustom !== undefined ? data.partyNameCustom : existing.partyNameCustom,
                notes: data.notes !== undefined ? data.notes : existing.notes,
                baseAmount: merged.baseAmount,
                gstApplicable: merged.gstApplicable,
                gstPercentage: merged.gstApplicable ? merged.gstPercentage : null,
                gstAmount: calculated.gstAmount,
                deductionType: merged.deductionType,
                deductionPercentageTDS: tds,
                ptAmountFixed: pt,
                deductionPercentageOther: other,
                deductionAmount: calculated.deductionAmount,
                netPayable: calculated.netPayable,
                paidAmount: merged.paidAmount,
                balance: calculated.balance,
                paymentStatus: calculated.paymentStatus,
            },
            include: {
                vendor: {
                    select: { id: true, companyName: true, vendorName: true },
                },
                employee: {
                    select: { id: true, name: true },
                },
            },
        });
    }
    // 4. Get Payments list with search, filter, and pagination
    static async getPayments(options) {
        const { search, paymentFrequency, partyType, paymentStatus, startDate, endDate, page = 1, limit = 10, } = options;
        const skip = (page - 1) * limit;
        const whereClause = {
            deletedAt: null,
        };
        // Apply exact filters
        if (paymentFrequency)
            whereClause.paymentFrequency = paymentFrequency;
        if (partyType)
            whereClause.partyType = partyType;
        if (paymentStatus)
            whereClause.paymentStatus = paymentStatus;
        // Apply date range filter
        if (startDate || endDate) {
            whereClause.expenseDate = {};
            if (startDate)
                whereClause.expenseDate.gte = new Date(startDate);
            if (endDate)
                whereClause.expenseDate.lte = new Date(endDate);
        }
        // Apply search logic
        if (search) {
            whereClause.OR = [
                { expenseType: { contains: search, mode: 'insensitive' } },
                { partyNameCustom: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
                {
                    vendor: {
                        OR: [
                            { companyName: { contains: search, mode: 'insensitive' } },
                            { vendorName: { contains: search, mode: 'insensitive' } },
                        ],
                    },
                },
                {
                    employee: {
                        name: { contains: search, mode: 'insensitive' },
                    },
                },
            ];
        }
        const [totalCount, payments] = await Promise.all([
            db_1.prisma.payment.count({ where: whereClause }),
            db_1.prisma.payment.findMany({
                where: whereClause,
                include: {
                    vendor: {
                        select: { id: true, companyName: true, vendorName: true },
                    },
                    employee: {
                        select: { id: true, name: true },
                    },
                },
                skip,
                take: limit,
                orderBy: { expenseDate: 'desc' },
            }),
        ]);
        return {
            payments,
            meta: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }
    // 5. Get Payment by ID
    static async getPaymentById(id) {
        return db_1.prisma.payment.findUnique({
            where: { id, deletedAt: null },
            include: {
                vendor: {
                    select: { id: true, companyName: true, vendorName: true },
                },
                employee: {
                    select: { id: true, name: true },
                },
            },
        });
    }
    // 6. Delete Payment (Soft/Hard strategy)
    static async deletePayment(id, hard = false) {
        const existing = await db_1.prisma.payment.findUnique({
            where: { id, deletedAt: null },
        });
        if (!existing)
            return null;
        if (hard) {
            await db_1.prisma.payment.delete({ where: { id } });
            return { type: 'HARD' };
        }
        else {
            await db_1.prisma.payment.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
            return { type: 'SOFT' };
        }
    }
}
exports.PaymentService = PaymentService;
