"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMCService = void 0;
const db_1 = require("../db");
const client_1 = require("@prisma/client");
class AMCService {
    // 1. Calculate financial details based on billing base amount
    static calculateFinancials(baseAmount, gstPercentage, tdsPercentage) {
        const base = Number(baseAmount);
        const gstPct = Number(gstPercentage || 0);
        const tdsPct = Number(tdsPercentage || 0);
        const gstAmount = Number(((base * gstPct) / 100).toFixed(2));
        const tdsAmount = Number(((base * tdsPct) / 100).toFixed(2));
        const grossAmount = Number((base + gstAmount).toFixed(2));
        // Receivables standard calculation: Base + GST - TDS
        const expectedAmount = Number((grossAmount - tdsAmount).toFixed(2));
        return {
            gstAmount,
            tdsAmount,
            grossAmount,
            expectedAmount,
        };
    }
    // 2. Generate billing cycle dates list helper
    static generateCyclesList(params) {
        const cycles = [];
        const start = new Date(params.startDate);
        const end = new Date(params.endDate);
        const base = Number(params.baseAmount);
        const gstPct = Number(params.gstPercentage || 0);
        const tdsPct = Number(params.tdsPercentage || 0);
        const financials = this.calculateFinancials(base, gstPct, tdsPct);
        const monthsIncrementMap = {
            [client_1.AMCBillingFrequency.MONTHLY]: 1,
            [client_1.AMCBillingFrequency.QUARTERLY]: 3,
            [client_1.AMCBillingFrequency.HALF_YEARLY]: 6,
            [client_1.AMCBillingFrequency.YEARLY]: 12,
        };
        const increment = monthsIncrementMap[params.billingFrequency];
        let currentCycleDate = new Date(start);
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        while (currentCycleDate <= end) {
            const cycleName = `${monthNames[currentCycleDate.getMonth()]} ${currentCycleDate.getFullYear()}`;
            cycles.push({
                cycleName,
                dueDate: new Date(currentCycleDate),
                baseAmount: base,
                gstAmount: financials.gstAmount,
                grossAmount: financials.grossAmount,
                tdsAmount: financials.tdsAmount,
                expectedAmount: financials.expectedAmount,
                receivedAmount: 0.00,
                outstandingAmount: financials.expectedAmount,
                piStatus: client_1.PIStatus.NOT_RAISED,
                tiStatus: client_1.TIStatus.NOT_CREATED,
                paymentStatus: client_1.AMCPaymentStatus.PENDING,
                paymentMatchStatus: client_1.PaymentMatchStatus.PENDING,
            });
            // Advance by frequency increment
            currentCycleDate = new Date(currentCycleDate.setMonth(currentCycleDate.getMonth() + increment));
        }
        return cycles;
    }
    // 3. Helper to update nextBillingDate based on unpaid cycle
    static async updateNextBillingDate(amcId, tx) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Find the next unpaid billing cycle that has a due date in the future
        const nextCycle = await tx.amcBillingCycle.findFirst({
            where: {
                amcId,
                paymentStatus: {
                    in: [client_1.AMCPaymentStatus.PENDING, client_1.AMCPaymentStatus.PARTIAL],
                },
                dueDate: {
                    gte: today,
                },
            },
            orderBy: {
                dueDate: 'asc',
            },
        });
        // If no future unpaid cycle, find the first unpaid cycle overall
        const fallbackCycle = nextCycle ? null : await tx.amcBillingCycle.findFirst({
            where: {
                amcId,
                paymentStatus: {
                    in: [client_1.AMCPaymentStatus.PENDING, client_1.AMCPaymentStatus.PARTIAL],
                },
            },
            orderBy: {
                dueDate: 'asc',
            },
        });
        const targetDate = nextCycle ? nextCycle.dueDate : (fallbackCycle ? fallbackCycle.dueDate : null);
        await tx.amc.update({
            where: { id: amcId },
            data: {
                nextBillingDate: targetDate,
            },
        });
    }
    // 4. Auto AMC Expiry runner
    static async autoExpiryCheck() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Set any AMC whose endDate has passed and status is ACTIVE to EXPIRED
        await db_1.prisma.amc.updateMany({
            where: {
                status: client_1.AMCStatus.ACTIVE,
                endDate: {
                    lt: today,
                },
            },
            data: {
                status: client_1.AMCStatus.EXPIRED,
            },
        });
    }
    // 5. Create AMC
    static async createAMC(data, userId) {
        // Run real-time auto expiry check first to maintain sync
        await this.autoExpiryCheck();
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const base = Number(data.baseAmountPerCycle);
        const gstPct = Number(data.gstPercentage || 0);
        const tdsPct = Number(data.tdsPercentage || 0);
        const financials = this.calculateFinancials(base, gstPct, tdsPct);
        // Generate initial billing cycles array
        const cyclesData = this.generateCyclesList({
            startDate: start,
            endDate: end,
            billingFrequency: data.billingFrequency,
            baseAmount: base,
            gstPercentage: gstPct,
            tdsPercentage: tdsPct,
        });
        const nextBillDate = cyclesData.length > 0 ? cyclesData[0].dueDate : null;
        // Check if current date > endDate to automatically initialize status as EXPIRED
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let initialStatus = data.status || client_1.AMCStatus.ACTIVE;
        if (end < today) {
            initialStatus = client_1.AMCStatus.EXPIRED;
        }
        return db_1.prisma.$transaction(async (tx) => {
            const amc = await tx.amc.create({
                data: {
                    customerId: data.customerId,
                    amcName: data.amcName,
                    startDate: start,
                    endDate: end,
                    billingFrequency: data.billingFrequency,
                    status: initialStatus,
                    baseAmountPerCycle: base,
                    gstPercentage: gstPct,
                    tdsPercentage: tdsPct,
                    gstAmount: financials.gstAmount,
                    tdsAmount: financials.tdsAmount,
                    grossAmount: financials.grossAmount,
                    expectedAmount: financials.expectedAmount,
                    nextBillingDate: nextBillDate,
                    notes: data.notes || null,
                    createdBy: userId,
                    updatedBy: userId,
                },
            });
            // Insert billing cycles mapped to this amc
            const mappedCycles = cyclesData.map((cycle) => ({
                ...cycle,
                amcId: amc.id,
            }));
            await tx.amcBillingCycle.createMany({
                data: mappedCycles,
            });
            // Update next billing date properly based on live cycles
            await this.updateNextBillingDate(amc.id, tx);
            return tx.amc.findUnique({
                where: { id: amc.id },
                include: {
                    billingCycles: { orderBy: { dueDate: 'asc' } },
                    customer: { select: { id: true, companyName: true, contactPerson: true } },
                },
            });
        });
    }
    // 6. Update AMC
    static async updateAMC(id, data, userId) {
        const existing = await db_1.prisma.amc.findUnique({
            where: { id, deletedAt: null },
            include: { billingCycles: true },
        });
        if (!existing)
            return null;
        const start = data.startDate !== undefined ? new Date(data.startDate) : existing.startDate;
        const end = data.endDate !== undefined ? new Date(data.endDate) : existing.endDate;
        const base = data.baseAmountPerCycle !== undefined ? Number(data.baseAmountPerCycle) : Number(existing.baseAmountPerCycle);
        const gstPct = data.gstPercentage !== undefined ? Number(data.gstPercentage) : Number(existing.gstPercentage);
        const tdsPct = data.tdsPercentage !== undefined ? Number(data.tdsPercentage) : Number(existing.tdsPercentage);
        const freq = data.billingFrequency || existing.billingFrequency;
        const financials = this.calculateFinancials(base, gstPct, tdsPct);
        // Determine if date boundaries, frequency, or base prices changed. If so, we need to regenerate unpaid cycles!
        const keyConfigChanged = data.startDate !== undefined ||
            data.endDate !== undefined ||
            data.billingFrequency !== undefined ||
            data.baseAmountPerCycle !== undefined ||
            data.gstPercentage !== undefined ||
            data.tdsPercentage !== undefined;
        return db_1.prisma.$transaction(async (tx) => {
            if (keyConfigChanged) {
                // Regenerating billing cycles:
                // Core Rule: Keep billing cycles that have already received payments (receivedAmount > 0) to avoid wiping history,
                // and safely replace all unpaid / fully pending cycles with newly generated schedule
                const paidOrPartialCycleIds = existing.billingCycles
                    .filter((cycle) => Number(cycle.receivedAmount) > 0)
                    .map((c) => c.id);
                // Delete unpaid cycles
                await tx.amcBillingCycle.deleteMany({
                    where: {
                        amcId: id,
                        id: { notIn: paidOrPartialCycleIds },
                    },
                });
                // Generate full list for new config
                const freshGeneratedList = this.generateCyclesList({
                    startDate: start,
                    endDate: end,
                    billingFrequency: freq,
                    baseAmount: base,
                    gstPercentage: gstPct,
                    tdsPercentage: tdsPct,
                });
                // Insert new cycles that do not overlap in cycleNames with existing paid/partial cycles
                const paidOrPartialCycleNames = existing.billingCycles
                    .filter((cycle) => Number(cycle.receivedAmount) > 0)
                    .map((c) => c.cycleName);
                const newCyclesToInsert = freshGeneratedList
                    .filter((c) => !paidOrPartialCycleNames.includes(c.cycleName))
                    .map((cycle) => ({
                    ...cycle,
                    amcId: id,
                }));
                if (newCyclesToInsert.length > 0) {
                    await tx.amcBillingCycle.createMany({
                        data: newCyclesToInsert,
                    });
                }
            }
            // Handle status expiry auto
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let targetStatus = data.status !== undefined ? data.status : existing.status;
            if (end < today && targetStatus === client_1.AMCStatus.ACTIVE) {
                targetStatus = client_1.AMCStatus.EXPIRED;
            }
            const updatedAmc = await tx.amc.update({
                where: { id },
                data: {
                    customerId: data.customerId !== undefined ? data.customerId : existing.customerId,
                    amcName: data.amcName !== undefined ? data.amcName : existing.amcName,
                    startDate: start,
                    endDate: end,
                    billingFrequency: freq,
                    status: targetStatus,
                    baseAmountPerCycle: base,
                    gstPercentage: gstPct,
                    tdsPercentage: tdsPct,
                    gstAmount: financials.gstAmount,
                    tdsAmount: financials.tdsAmount,
                    grossAmount: financials.grossAmount,
                    expectedAmount: financials.expectedAmount,
                    notes: data.notes !== undefined ? data.notes : existing.notes,
                    updatedBy: userId,
                },
            });
            // Recalculate billing dates
            await this.updateNextBillingDate(id, tx);
            return tx.amc.findUnique({
                where: { id: updatedAmc.id },
                include: {
                    billingCycles: { orderBy: { dueDate: 'asc' } },
                    customer: { select: { id: true, companyName: true, contactPerson: true } },
                },
            });
        });
    }
    // 7. Get AMC by ID
    static async getAMCById(id) {
        await this.autoExpiryCheck();
        return db_1.prisma.amc.findUnique({
            where: { id, deletedAt: null },
            include: {
                billingCycles: { orderBy: { dueDate: 'asc' } },
                customer: {
                    select: {
                        id: true,
                        companyName: true,
                        contactPerson: true,
                        phoneNumber: true,
                        email: true,
                        gstApplicable: true,
                        gstinNumber: true,
                        tdsApplicable: true,
                        tdsPercentage: true,
                    },
                },
            },
        });
    }
    // 8. Delete AMC (Soft/Hard delete)
    static async deleteAMC(id, hard = false) {
        const existing = await db_1.prisma.amc.findUnique({
            where: { id, deletedAt: null },
        });
        if (!existing)
            return null;
        if (hard) {
            await db_1.prisma.amc.delete({ where: { id } });
            return { type: 'HARD' };
        }
        else {
            await db_1.prisma.amc.update({
                where: { id },
                data: { deletedAt: new Date(), status: client_1.AMCStatus.CANCELLED },
            });
            return { type: 'SOFT' };
        }
    }
    // 9. Get all AMCs with pagination, search, and filtration
    static async getAMCs(options) {
        await this.autoExpiryCheck();
        const { search, customerId, billingFrequency, status, startDate, endDate, page = 1, limit = 10, } = options;
        const skip = (page - 1) * limit;
        const whereClause = {
            deletedAt: null,
        };
        if (customerId)
            whereClause.customerId = customerId;
        if (billingFrequency)
            whereClause.billingFrequency = billingFrequency;
        if (status)
            whereClause.status = status;
        if (startDate || endDate) {
            whereClause.startDate = {};
            if (startDate)
                whereClause.startDate.gte = new Date(startDate);
            if (endDate)
                whereClause.startDate.lte = new Date(endDate);
        }
        if (search) {
            whereClause.OR = [
                { amcName: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
                {
                    customer: {
                        OR: [
                            { companyName: { contains: search, mode: 'insensitive' } },
                            { contactPerson: { contains: search, mode: 'insensitive' } },
                        ],
                    },
                },
            ];
        }
        const [totalCount, amcs] = await Promise.all([
            db_1.prisma.amc.count({ where: whereClause }),
            db_1.prisma.amc.findMany({
                where: whereClause,
                include: {
                    customer: { select: { id: true, companyName: true, contactPerson: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return {
            amcs,
            meta: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }
    // 10. Update Status
    static async updateStatus(id, status, userId) {
        const existing = await db_1.prisma.amc.findUnique({
            where: { id, deletedAt: null },
        });
        if (!existing)
            return null;
        return db_1.prisma.amc.update({
            where: { id },
            data: { status, updatedBy: userId },
            include: {
                customer: { select: { id: true, companyName: true, contactPerson: true } },
            },
        });
    }
    // 11. Generate / Regenerate Billing Cycles On-Demand
    static async generateBillingCycles(amcId, userId) {
        const amc = await db_1.prisma.amc.findUnique({
            where: { id: amcId, deletedAt: null },
            include: { billingCycles: true },
        });
        if (!amc)
            return null;
        return db_1.prisma.$transaction(async (tx) => {
            // Keep cycles with historical payments
            const paidCycleIds = amc.billingCycles
                .filter((c) => Number(c.receivedAmount) > 0)
                .map((c) => c.id);
            // Delete unpaid ones
            await tx.amcBillingCycle.deleteMany({
                where: {
                    amcId,
                    id: { notIn: paidCycleIds },
                },
            });
            const fullSchedule = this.generateCyclesList({
                startDate: amc.startDate,
                endDate: amc.endDate,
                billingFrequency: amc.billingFrequency,
                baseAmount: Number(amc.baseAmountPerCycle),
                gstPercentage: Number(amc.gstPercentage),
                tdsPercentage: Number(amc.tdsPercentage),
            });
            const paidCycleNames = amc.billingCycles
                .filter((c) => Number(c.receivedAmount) > 0)
                .map((c) => c.cycleName);
            const itemsToInsert = fullSchedule
                .filter((item) => !paidCycleNames.includes(item.cycleName))
                .map((item) => ({
                ...item,
                amcId,
            }));
            if (itemsToInsert.length > 0) {
                await tx.amcBillingCycle.createMany({
                    data: itemsToInsert,
                });
            }
            await tx.amc.update({
                where: { id: amcId },
                data: { updatedBy: userId },
            });
            await this.updateNextBillingDate(amcId, tx);
            return tx.amcBillingCycle.findMany({
                where: { amcId },
                orderBy: { dueDate: 'asc' },
            });
        });
    }
    // 12. Update Billing Cycle Payment details
    static async updateBillingCyclePayment(cycleId, data, userId) {
        const cycle = await db_1.prisma.amcBillingCycle.findUnique({
            where: { id: cycleId },
            include: { amc: true },
        });
        if (!cycle || cycle.amc.deletedAt !== null)
            return null;
        const expected = Number(cycle.expectedAmount);
        const received = Number(data.receivedAmount);
        const outstanding = Number((expected - received).toFixed(2));
        let payStatus = client_1.AMCPaymentStatus.PENDING;
        if (received >= expected) {
            payStatus = client_1.AMCPaymentStatus.PAID;
        }
        else if (received > 0) {
            payStatus = client_1.AMCPaymentStatus.PARTIAL;
        }
        return db_1.prisma.$transaction(async (tx) => {
            const updatedCycle = await tx.amcBillingCycle.update({
                where: { id: cycleId },
                data: {
                    receivedAmount: received,
                    outstandingAmount: outstanding,
                    paymentStatus: payStatus,
                    remarks: data.remarks || cycle.remarks,
                },
            });
            // Touch parent auditor and nextBillingDate
            await tx.amc.update({
                where: { id: cycle.amcId },
                data: { updatedBy: userId },
            });
            await this.updateNextBillingDate(cycle.amcId, tx);
            return updatedCycle;
        });
    }
    // 13. Update cycle PI / TI statuses
    static async updatePiTiStatus(cycleId, data, userId) {
        const cycle = await db_1.prisma.amcBillingCycle.findUnique({
            where: { id: cycleId },
        });
        if (!cycle)
            return null;
        return db_1.prisma.$transaction(async (tx) => {
            const updated = await tx.amcBillingCycle.update({
                where: { id: cycleId },
                data: {
                    piStatus: data.piStatus !== undefined ? data.piStatus : cycle.piStatus,
                    tiStatus: data.tiStatus !== undefined ? data.tiStatus : cycle.tiStatus,
                    remarks: data.remarks || cycle.remarks,
                },
            });
            await tx.amc.update({
                where: { id: cycle.amcId },
                data: { updatedBy: userId },
            });
            return updated;
        });
    }
    // 14. Mark payment matched
    static async markPaymentMatched(cycleId, status, userId) {
        const cycle = await db_1.prisma.amcBillingCycle.findUnique({
            where: { id: cycleId },
        });
        if (!cycle)
            return null;
        return db_1.prisma.$transaction(async (tx) => {
            const updated = await tx.amcBillingCycle.update({
                where: { id: cycleId },
                data: {
                    paymentMatchStatus: status,
                },
            });
            await tx.amc.update({
                where: { id: cycle.amcId },
                data: { updatedBy: userId },
            });
            return updated;
        });
    }
    // 15. Get Upcoming Billing Cycles (unpaid cycles due in future)
    static async getUpcomingBillingCycles() {
        await this.autoExpiryCheck();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return db_1.prisma.amcBillingCycle.findMany({
            where: {
                dueDate: { gte: today },
                paymentStatus: {
                    in: [client_1.AMCPaymentStatus.PENDING, client_1.AMCPaymentStatus.PARTIAL],
                },
                amc: {
                    status: client_1.AMCStatus.ACTIVE,
                    deletedAt: null,
                },
            },
            include: {
                amc: {
                    select: {
                        amcName: true,
                        customer: { select: { companyName: true, contactPerson: true } },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });
    }
    // 16. Get Overdue Payments (unpaid cycles due in the past)
    static async getOverduePayments() {
        await this.autoExpiryCheck();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return db_1.prisma.amcBillingCycle.findMany({
            where: {
                dueDate: { lt: today },
                paymentStatus: {
                    in: [client_1.AMCPaymentStatus.PENDING, client_1.AMCPaymentStatus.PARTIAL],
                },
                amc: {
                    deletedAt: null,
                    status: {
                        in: [client_1.AMCStatus.ACTIVE, client_1.AMCStatus.EXPIRED],
                    },
                },
            },
            include: {
                amc: {
                    select: {
                        amcName: true,
                        customer: { select: { companyName: true, contactPerson: true } },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });
    }
}
exports.AMCService = AMCService;
