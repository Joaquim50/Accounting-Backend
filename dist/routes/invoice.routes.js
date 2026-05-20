"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const invoiceUpload_middleware_1 = require("../middlewares/invoiceUpload.middleware");
const invoice_controller_1 = require("../controllers/invoice.controller");
const router = (0, express_1.Router)();
// Secure all invoice routes
router.use(auth_middleware_1.authenticate);
// ==========================================
// Proforma Invoice (PI) Routes
// ==========================================
router.post('/proforma', invoice_controller_1.createPI);
router.get('/proforma', invoice_controller_1.getPIs);
router.get('/proforma/outstanding', invoice_controller_1.getOutstandingPIs);
router.get('/proforma/shortfall', invoice_controller_1.getShortfallPIs);
router.get('/proforma/:id', invoice_controller_1.getPIById);
router.put('/proforma/:id', invoice_controller_1.updatePI);
router.delete('/proforma/:id', invoice_controller_1.deletePI);
router.patch('/proforma/:id/status', invoice_controller_1.updatePIStatus);
router.post('/proforma/:id/payment', invoice_controller_1.recordPayment);
// File uploads for PI
router.post('/proforma/:id/file', invoiceUpload_middleware_1.invoiceUpload.single('file'), invoice_controller_1.uploadPIFile);
router.delete('/proforma/:id/file', invoice_controller_1.deletePIFile);
// ==========================================
// Tax Invoice (TI) Routes
// ==========================================
router.post('/tax/generate/:piId', invoice_controller_1.generateTIFromPI); // From existing PI
router.post('/tax', invoice_controller_1.createDirectTI); // Direct TI
router.get('/tax', invoice_controller_1.getTIs);
router.get('/tax/:id', invoice_controller_1.getTIById);
router.put('/tax/:id', invoice_controller_1.updateTI);
router.delete('/tax/:id', invoice_controller_1.deleteTI);
router.patch('/tax/:id/status', invoice_controller_1.updateTIStatus);
// File uploads for TI
router.post('/tax/:id/file', invoiceUpload_middleware_1.invoiceUpload.single('file'), invoice_controller_1.uploadTIFile);
router.delete('/tax/:id/file', invoice_controller_1.deleteTIFile);
exports.default = router;
