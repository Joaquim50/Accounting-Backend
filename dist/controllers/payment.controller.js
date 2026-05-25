"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePayment = exports.updatePayment = exports.bulkCreatePayments = exports.createPayment = exports.getPaymentById = exports.getPayments = void 0;
const payment_service_1 = require("../services/payment.service");
const payment_validator_1 = require("../validators/payment.validator");
// 1. Get all payments with filters and pagination
const getPayments = async (req, res, next) => {
    try {
        const { search, paymentFrequency, partyType, paymentStatus, startDate, endDate, page, limit, } = req.query;
        const result = await payment_service_1.PaymentService.getPayments({
            search: search,
            paymentFrequency: paymentFrequency,
            partyType: partyType,
            paymentStatus: paymentStatus,
            startDate: startDate,
            endDate: endDate,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
        res.json({
            success: true,
            message: 'Payments retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPayments = getPayments;
// 2. Get payment by ID
const getPaymentById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const payment = await payment_service_1.PaymentService.getPaymentById(id);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found',
            });
        }
        res.json({
            success: true,
            message: 'Payment record retrieved successfully',
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentById = getPaymentById;
// 3. Create a new payment record
const createPayment = async (req, res, next) => {
    try {
        const parsedData = payment_validator_1.createPaymentSchema.parse(req.body);
        const payment = await payment_service_1.PaymentService.createPayment(parsedData);
        res.status(201).json({
            success: true,
            message: 'Payment record created successfully',
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createPayment = createPayment;
// 3.5 Bulk create payments
const bulkCreatePayments = async (req, res, next) => {
    try {
        const parsedData = payment_validator_1.bulkCreatePaymentSchema.parse(req.body);
        const payments = await payment_service_1.PaymentService.bulkCreatePayments(parsedData.payments);
        res.status(201).json({
            success: true,
            message: `${payments.length} payment records created successfully via bulk upload`,
            data: payments,
        });
    }
    catch (error) {
        console.error("Bulk Upload Error:", error);
        next(error);
    }
};
exports.bulkCreatePayments = bulkCreatePayments;
// 4. Update an existing payment record
const updatePayment = async (req, res, next) => {
    try {
        const id = req.params.id;
        const parsedData = payment_validator_1.updatePaymentSchema.parse(req.body);
        const payment = await payment_service_1.PaymentService.updatePayment(id, parsedData);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found',
            });
        }
        res.json({
            success: true,
            message: 'Payment record updated successfully',
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePayment = updatePayment;
// 5. Delete payment record
const deletePayment = async (req, res, next) => {
    try {
        const id = req.params.id;
        const isHardDelete = req.query.hard === 'true';
        const result = await payment_service_1.PaymentService.deletePayment(id, isHardDelete);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found',
            });
        }
        res.json({
            success: true,
            message: result.type === 'HARD'
                ? 'Payment permanently deleted'
                : 'Payment soft deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deletePayment = deletePayment;
