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
router.post('/proforma', (0, auth_middleware_1.authorizePermission)('proformaInvoice.create'), invoice_controller_1.createPI);
router.get('/proforma', (0, auth_middleware_1.authorizePermission)('proformaInvoice.view'), invoice_controller_1.getPIs);
router.get('/proforma/outstanding', (0, auth_middleware_1.authorizePermission)('proformaInvoice.view'), invoice_controller_1.getOutstandingPIs);
router.get('/proforma/shortfall', (0, auth_middleware_1.authorizePermission)('proformaInvoice.view'), invoice_controller_1.getShortfallPIs);
router.get('/proforma/:id', (0, auth_middleware_1.authorizePermission)('proformaInvoice.view'), invoice_controller_1.getPIById);
router.put('/proforma/:id', (0, auth_middleware_1.authorizePermission)('proformaInvoice.edit'), invoice_controller_1.updatePI);
router.delete('/proforma/:id', (0, auth_middleware_1.authorizePermission)('proformaInvoice.delete'), invoice_controller_1.deletePI);
router.patch('/proforma/:id/status', (0, auth_middleware_1.authorizePermission)('proformaInvoice.approve'), invoice_controller_1.updatePIStatus);
router.post('/proforma/:id/payment', (0, auth_middleware_1.authorizePermission)('proformaInvoice.edit'), invoice_controller_1.recordPayment);
// File uploads for PI
router.post('/proforma/:id/file', (0, auth_middleware_1.authorizePermission)('proformaInvoice.edit'), invoiceUpload_middleware_1.invoiceUpload.single('file'), invoice_controller_1.uploadPIFile);
router.delete('/proforma/:id/file', (0, auth_middleware_1.authorizePermission)('proformaInvoice.edit'), invoice_controller_1.deletePIFile);
// ==========================================
// Tax Invoice (TI) Routes
// ==========================================
router.post('/tax/generate/:piId', (0, auth_middleware_1.authorizePermission)('taxInvoice.create'), invoice_controller_1.generateTIFromPI); // From existing PI
router.post('/tax', (0, auth_middleware_1.authorizePermission)('taxInvoice.create'), invoice_controller_1.createDirectTI); // Direct TI
router.get('/tax', (0, auth_middleware_1.authorizePermission)('taxInvoice.view'), invoice_controller_1.getTIs);
router.get('/tax/:id', (0, auth_middleware_1.authorizePermission)('taxInvoice.view'), invoice_controller_1.getTIById);
router.put('/tax/:id', (0, auth_middleware_1.authorizePermission)('taxInvoice.edit'), invoice_controller_1.updateTI);
router.delete('/tax/:id', (0, auth_middleware_1.authorizePermission)('taxInvoice.delete'), invoice_controller_1.deleteTI);
router.patch('/tax/:id/status', (0, auth_middleware_1.authorizePermission)('taxInvoice.approve'), invoice_controller_1.updateTIStatus);
// File uploads for TI
router.post('/tax/:id/file', (0, auth_middleware_1.authorizePermission)('taxInvoice.edit'), invoiceUpload_middleware_1.invoiceUpload.single('file'), invoice_controller_1.uploadTIFile);
router.delete('/tax/:id/file', (0, auth_middleware_1.authorizePermission)('taxInvoice.edit'), invoice_controller_1.deleteTIFile);
exports.default = router;
