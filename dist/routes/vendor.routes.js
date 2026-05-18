"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_controller_1 = require("../controllers/vendor.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const vendorUpload_middleware_1 = require("../middlewares/vendorUpload.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(auth_middleware_1.authenticate);
// Base vendor routes
router.get('/vendors', vendor_controller_1.getVendors);
router.post('/vendors', vendor_controller_1.createVendor);
router.get('/vendors/:id', vendor_controller_1.getVendorById);
router.put('/vendors/:id', vendor_controller_1.updateVendor);
router.patch('/vendors/:id/status', vendor_controller_1.updateVendorStatus);
router.delete('/vendors/:id', vendor_controller_1.deleteVendor);
// Logo upload route
router.post('/vendors/:id/logo', vendorUpload_middleware_1.vendorUpload.single('logo'), vendor_controller_1.uploadVendorLogo);
// Document specific routes nested under vendor
router.post('/vendors/:id/documents', vendorUpload_middleware_1.vendorUpload.array('files', 10), vendor_controller_1.uploadVendorDocuments);
router.get('/vendors/:id/documents', vendor_controller_1.getVendorDocuments);
router.get('/vendors/:id/documents/:type', vendor_controller_1.getVendorDocumentsByType);
// Document deletion & update route
router.delete('/vendor-documents/:documentId', vendor_controller_1.removeVendorDocument);
router.patch('/vendor-documents/:documentId/latest', vendor_controller_1.markVendorDocumentAsLatest);
exports.default = router;
