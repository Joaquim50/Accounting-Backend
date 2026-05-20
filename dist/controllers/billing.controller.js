"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRowDetails = exports.getBillingTrackerList = exports.getDashboardSummary = void 0;
const billing_service_1 = require("../services/billing.service");
const billing_validator_1 = require("../validators/billing.validator");
const getDashboardSummary = async (req, res, next) => {
    try {
        const filters = billing_validator_1.getBillingTrackerQuerySchema.parse(req.query);
        const summary = await billing_service_1.BillingService.getDashboardSummary(filters);
        res.json({
            success: true,
            message: 'Billing dashboard summary retrieved successfully',
            data: summary,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardSummary = getDashboardSummary;
const getBillingTrackerList = async (req, res, next) => {
    try {
        const filters = billing_validator_1.getBillingTrackerQuerySchema.parse(req.query);
        const result = await billing_service_1.BillingService.getBillingTracker(filters);
        res.json({
            success: true,
            message: 'Consolidated billing tracker retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getBillingTrackerList = getBillingTrackerList;
const getRowDetails = async (req, res, next) => {
    try {
        const id = req.params.id;
        const sourceType = req.params.sourceType;
        if (!id || !sourceType) {
            return res.status(400).json({ success: false, message: 'ID and sourceType are required' });
        }
        const details = await billing_service_1.BillingService.getRowDetails(id, sourceType);
        if (!details) {
            return res.status(404).json({ success: false, message: 'Row details not found' });
        }
        res.json({
            success: true,
            message: 'Row details retrieved successfully',
            data: details,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getRowDetails = getRowDetails;
