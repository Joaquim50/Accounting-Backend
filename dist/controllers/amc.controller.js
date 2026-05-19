"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverduePayments = exports.getUpcomingBillingCycles = exports.markPaymentMatched = exports.updatePiTiStatus = exports.updateBillingCyclePayment = exports.generateBillingCycles = exports.updateAMCStatus = exports.getAMCs = exports.getAMCById = exports.deleteAMC = exports.updateAMC = exports.createAMC = void 0;
const amc_service_1 = require("../services/amc.service");
const amc_validator_1 = require("../validators/amc.validator");
// 1. Create AMC
const createAMC = async (req, res, next) => {
    try {
        const parsedData = amc_validator_1.createAMCSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const amc = await amc_service_1.AMCService.createAMC(parsedData, userId);
        res.status(201).json({
            success: true,
            message: 'AMC created and billing schedule initialized successfully',
            data: amc,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createAMC = createAMC;
// 2. Update AMC
const updateAMC = async (req, res, next) => {
    try {
        const id = req.params.id;
        const parsedData = amc_validator_1.updateAMCSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const amc = await amc_service_1.AMCService.updateAMC(id, parsedData, userId);
        if (!amc) {
            return res.status(404).json({
                success: false,
                message: 'AMC record not found',
            });
        }
        res.json({
            success: true,
            message: 'AMC details and billing cycles updated successfully',
            data: amc,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateAMC = updateAMC;
// 3. Delete AMC (Soft/Hard delete)
const deleteAMC = async (req, res, next) => {
    try {
        const id = req.params.id;
        const isHardDelete = req.query.hard === 'true';
        const result = await amc_service_1.AMCService.deleteAMC(id, isHardDelete);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'AMC record not found',
            });
        }
        res.json({
            success: true,
            message: result.type === 'HARD'
                ? 'AMC record permanently deleted'
                : 'AMC record soft deleted and marked as CANCELLED successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteAMC = deleteAMC;
// 4. Get AMC by ID
const getAMCById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const amc = await amc_service_1.AMCService.getAMCById(id);
        if (!amc) {
            return res.status(404).json({
                success: false,
                message: 'AMC record not found',
            });
        }
        res.json({
            success: true,
            message: 'AMC details retrieved successfully',
            data: amc,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAMCById = getAMCById;
// 5. Get all AMCs with pagination, search, and filtering
const getAMCs = async (req, res, next) => {
    try {
        const { search, customerId, billingFrequency, status, startDate, endDate, page, limit, } = req.query;
        const result = await amc_service_1.AMCService.getAMCs({
            search: search,
            customerId: customerId,
            billingFrequency: billingFrequency,
            status: status,
            startDate: startDate,
            endDate: endDate,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
        res.json({
            success: true,
            message: 'AMC records retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAMCs = getAMCs;
// 6. Update AMC Status
const updateAMCStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { status } = amc_validator_1.updateAMCStatusSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const amc = await amc_service_1.AMCService.updateStatus(id, status, userId);
        if (!amc) {
            return res.status(404).json({
                success: false,
                message: 'AMC record not found',
            });
        }
        res.json({
            success: true,
            message: 'AMC status updated successfully',
            data: amc,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateAMCStatus = updateAMCStatus;
// 7. Regenerate Billing Cycles On-Demand
const generateBillingCycles = async (req, res, next) => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const cycles = await amc_service_1.AMCService.generateBillingCycles(id, userId);
        if (!cycles) {
            return res.status(404).json({
                success: false,
                message: 'AMC record not found',
            });
        }
        res.json({
            success: true,
            message: 'Unpaid billing cycles regenerated successfully',
            data: cycles,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generateBillingCycles = generateBillingCycles;
// 8. Update Billing Cycle Payment details
const updateBillingCyclePayment = async (req, res, next) => {
    try {
        const cycleId = req.params.cycleId;
        const parsedData = amc_validator_1.updateBillingCyclePaymentSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const updatedCycle = await amc_service_1.AMCService.updateBillingCyclePayment(cycleId, parsedData, userId);
        if (!updatedCycle) {
            return res.status(404).json({
                success: false,
                message: 'Billing cycle or active parent AMC not found',
            });
        }
        res.json({
            success: true,
            message: 'Billing cycle payment information updated successfully',
            data: updatedCycle,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateBillingCyclePayment = updateBillingCyclePayment;
// 9. Update PI / TI Statuses
const updatePiTiStatus = async (req, res, next) => {
    try {
        const cycleId = req.params.cycleId;
        const parsedData = amc_validator_1.updateCyclePiTiSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const updatedCycle = await amc_service_1.AMCService.updatePiTiStatus(cycleId, parsedData, userId);
        if (!updatedCycle) {
            return res.status(404).json({
                success: false,
                message: 'Billing cycle not found',
            });
        }
        res.json({
            success: true,
            message: 'Billing cycle PI/TI invoice statuses updated successfully',
            data: updatedCycle,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePiTiStatus = updatePiTiStatus;
// 10. Mark Payment Matched
const markPaymentMatched = async (req, res, next) => {
    try {
        const cycleId = req.params.cycleId;
        const { paymentMatchStatus } = amc_validator_1.markPaymentMatchedSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. User session not found.',
            });
        }
        const updatedCycle = await amc_service_1.AMCService.markPaymentMatched(cycleId, paymentMatchStatus, userId);
        if (!updatedCycle) {
            return res.status(404).json({
                success: false,
                message: 'Billing cycle not found',
            });
        }
        res.json({
            success: true,
            message: 'Billing cycle payment match status updated successfully',
            data: updatedCycle,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markPaymentMatched = markPaymentMatched;
// 11. Get Upcoming Billing Cycles
const getUpcomingBillingCycles = async (req, res, next) => {
    try {
        const cycles = await amc_service_1.AMCService.getUpcomingBillingCycles();
        res.json({
            success: true,
            message: 'Upcoming unpaid billing cycles fetched successfully',
            data: cycles,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUpcomingBillingCycles = getUpcomingBillingCycles;
// 12. Get Overdue Payments
const getOverduePayments = async (req, res, next) => {
    try {
        const cycles = await amc_service_1.AMCService.getOverduePayments();
        res.json({
            success: true,
            message: 'Overdue unpaid payments fetched successfully',
            data: cycles,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOverduePayments = getOverduePayments;
