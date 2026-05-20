"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTIFile = exports.uploadTIFile = exports.updateTIStatus = exports.getTIs = exports.getTIById = exports.deleteTI = exports.updateTI = exports.createDirectTI = exports.generateTIFromPI = exports.getShortfallPIs = exports.getOutstandingPIs = exports.recordPayment = exports.deletePIFile = exports.uploadPIFile = exports.updatePIStatus = exports.getPIs = exports.getPIById = exports.deletePI = exports.updatePI = exports.createPI = void 0;
const invoice_service_1 = require("../services/invoice.service");
const invoice_validator_1 = require("../validators/invoice.validator");
// ==========================================
// Proforma Invoice Controllers
// ==========================================
const createPI = async (req, res, next) => {
    try {
        const parsedData = invoice_validator_1.createProformaInvoiceSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const pi = await invoice_service_1.InvoiceService.createPI(parsedData, userId);
        res.status(201).json({ success: true, message: 'Proforma Invoice created successfully', data: pi });
    }
    catch (error) {
        next(error);
    }
};
exports.createPI = createPI;
const updatePI = async (req, res, next) => {
    try {
        const id = req.params.id;
        const parsedData = invoice_validator_1.updateProformaInvoiceSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const pi = await invoice_service_1.InvoiceService.updatePI(id, parsedData, userId);
        res.json({ success: true, message: 'Proforma Invoice updated successfully', data: pi });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePI = updatePI;
const deletePI = async (req, res, next) => {
    try {
        const id = req.params.id;
        const isHardDelete = req.query.hard === 'true';
        await invoice_service_1.InvoiceService.deletePI(id, isHardDelete);
        res.json({ success: true, message: isHardDelete ? 'PI hard deleted' : 'PI soft deleted and cancelled' });
    }
    catch (error) {
        next(error);
    }
};
exports.deletePI = deletePI;
const getPIById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const pi = await invoice_service_1.InvoiceService.getPIById(id);
        if (!pi)
            return res.status(404).json({ success: false, message: 'PI not found' });
        res.json({ success: true, message: 'PI retrieved successfully', data: pi });
    }
    catch (error) {
        next(error);
    }
};
exports.getPIById = getPIById;
const getPIs = async (req, res, next) => {
    try {
        const { search, clientId, projectId, status, startDate, endDate, paymentStatus, page, limit } = req.query;
        const result = await invoice_service_1.InvoiceService.getPIs({
            search: search,
            clientId: clientId,
            projectId: projectId,
            status: status,
            startDate: startDate,
            endDate: endDate,
            paymentStatus: paymentStatus,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
        res.json({ success: true, message: 'PIs retrieved successfully', data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.getPIs = getPIs;
const updatePIStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { status } = invoice_validator_1.updateProformaInvoiceStatusSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const pi = await invoice_service_1.InvoiceService.updatePIStatus(id, status, userId);
        res.json({ success: true, message: 'PI status updated successfully', data: pi });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePIStatus = updatePIStatus;
const uploadPIFile = async (req, res, next) => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        const file = req.file;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!file)
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        const filePath = `/uploads/invoices/${file.filename}`;
        const pi = await invoice_service_1.InvoiceService.uploadPIFile(id, filePath, userId);
        res.json({ success: true, message: 'PI file uploaded successfully', data: pi });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadPIFile = uploadPIFile;
const deletePIFile = async (req, res, next) => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const pi = await invoice_service_1.InvoiceService.deletePIFile(id, userId);
        res.json({ success: true, message: 'PI file deleted successfully', data: pi });
    }
    catch (error) {
        next(error);
    }
};
exports.deletePIFile = deletePIFile;
const recordPayment = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { receivedAmount, remarks } = invoice_validator_1.recordPaymentSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const pi = await invoice_service_1.InvoiceService.recordPIPayment(id, receivedAmount, remarks, userId);
        res.json({ success: true, message: 'Payment recorded successfully', data: pi });
    }
    catch (error) {
        next(error);
    }
};
exports.recordPayment = recordPayment;
const getOutstandingPIs = async (req, res, next) => {
    try {
        const pis = await invoice_service_1.InvoiceService.getOutstandingPIs();
        res.json({ success: true, message: 'Outstanding PIs retrieved successfully', data: pis });
    }
    catch (error) {
        next(error);
    }
};
exports.getOutstandingPIs = getOutstandingPIs;
const getShortfallPIs = async (req, res, next) => {
    try {
        const pis = await invoice_service_1.InvoiceService.getShortfallPIs();
        res.json({ success: true, message: 'Shortfall PIs retrieved successfully', data: pis });
    }
    catch (error) {
        next(error);
    }
};
exports.getShortfallPIs = getShortfallPIs;
// ==========================================
// Tax Invoice Controllers
// ==========================================
const generateTIFromPI = async (req, res, next) => {
    try {
        const piId = req.params.piId;
        const userId = req.user?.id;
        const { tiDate, notes } = req.body;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!tiDate)
            return res.status(400).json({ success: false, message: 'tiDate is required' });
        const ti = await invoice_service_1.InvoiceService.generateTIFromPI(piId, new Date(tiDate), notes, userId);
        res.status(201).json({ success: true, message: 'Tax Invoice generated from PI successfully', data: ti });
    }
    catch (error) {
        next(error);
    }
};
exports.generateTIFromPI = generateTIFromPI;
const createDirectTI = async (req, res, next) => {
    try {
        const parsedData = invoice_validator_1.createTaxInvoiceSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const ti = await invoice_service_1.InvoiceService.createDirectTI(parsedData, userId);
        res.status(201).json({ success: true, message: 'Direct Tax Invoice created successfully', data: ti });
    }
    catch (error) {
        next(error);
    }
};
exports.createDirectTI = createDirectTI;
const updateTI = async (req, res, next) => {
    try {
        const id = req.params.id;
        const parsedData = invoice_validator_1.updateTaxInvoiceSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const ti = await invoice_service_1.InvoiceService.updateTI(id, parsedData, userId);
        res.json({ success: true, message: 'Tax Invoice updated successfully', data: ti });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTI = updateTI;
const deleteTI = async (req, res, next) => {
    try {
        const id = req.params.id;
        const isHardDelete = req.query.hard === 'true';
        await invoice_service_1.InvoiceService.deleteTI(id, isHardDelete);
        res.json({ success: true, message: isHardDelete ? 'TI hard deleted' : 'TI soft deleted and cancelled' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTI = deleteTI;
const getTIById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const ti = await invoice_service_1.InvoiceService.getTIById(id);
        if (!ti)
            return res.status(404).json({ success: false, message: 'TI not found' });
        res.json({ success: true, message: 'TI retrieved successfully', data: ti });
    }
    catch (error) {
        next(error);
    }
};
exports.getTIById = getTIById;
const getTIs = async (req, res, next) => {
    try {
        const { search, clientId, projectId, status, startDate, endDate, page, limit } = req.query;
        const result = await invoice_service_1.InvoiceService.getTIs({
            search: search,
            clientId: clientId,
            projectId: projectId,
            status: status,
            startDate: startDate,
            endDate: endDate,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
        res.json({ success: true, message: 'TIs retrieved successfully', data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.getTIs = getTIs;
const updateTIStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { status } = invoice_validator_1.updateTaxInvoiceStatusSchema.parse(req.body);
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const ti = await invoice_service_1.InvoiceService.updateTIStatus(id, status, userId);
        res.json({ success: true, message: 'TI status updated successfully', data: ti });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTIStatus = updateTIStatus;
const uploadTIFile = async (req, res, next) => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        const file = req.file;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        if (!file)
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        const filePath = `/uploads/invoices/${file.filename}`;
        const ti = await invoice_service_1.InvoiceService.uploadTIFile(id, filePath, userId);
        res.json({ success: true, message: 'TI file uploaded successfully', data: ti });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadTIFile = uploadTIFile;
const deleteTIFile = async (req, res, next) => {
    try {
        const id = req.params.id;
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const ti = await invoice_service_1.InvoiceService.deleteTIFile(id, userId);
        res.json({ success: true, message: 'TI file deleted successfully', data: ti });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTIFile = deleteTIFile;
