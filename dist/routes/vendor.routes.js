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
router.get('/vendors', (0, auth_middleware_1.authorizePermission)('vendors.view'), vendor_controller_1.getVendors);
router.get('/vendors/dropdown', (0, auth_middleware_1.authorizePermission)('vendors.view'), vendor_controller_1.getVendorDropdown);
router.post('/vendors/bulk', (0, auth_middleware_1.authorizePermission)('vendors.create'), vendor_controller_1.bulkCreateVendors);
router.post('/vendors', (0, auth_middleware_1.authorizePermission)('vendors.create'), vendor_controller_1.createVendor);
router.get('/vendors/:id', (0, auth_middleware_1.authorizePermission)('vendors.view'), vendor_controller_1.getVendorById);
router.put('/vendors/:id', (0, auth_middleware_1.authorizePermission)('vendors.edit'), vendor_controller_1.updateVendor);
router.patch('/vendors/:id/status', (0, auth_middleware_1.authorizePermission)('vendors.edit'), vendor_controller_1.updateVendorStatus);
router.delete('/vendors/:id', (0, auth_middleware_1.authorizePermission)('vendors.delete'), vendor_controller_1.deleteVendor);
// Logo upload route
router.post('/vendors/:id/logo', (0, auth_middleware_1.authorizePermission)('vendors.edit'), vendorUpload_middleware_1.vendorUpload.single('logo'), vendor_controller_1.uploadVendorLogo);
// Document specific routes nested under vendor
router.post('/vendors/:id/documents', (0, auth_middleware_1.authorizePermission)('vendors.edit'), vendorUpload_middleware_1.vendorUpload.array('files', 10), vendor_controller_1.uploadVendorDocuments);
router.get('/vendors/:id/documents', (0, auth_middleware_1.authorizePermission)('vendors.view'), vendor_controller_1.getVendorDocuments);
router.get('/vendors/:id/documents/:type', (0, auth_middleware_1.authorizePermission)('vendors.view'), vendor_controller_1.getVendorDocumentsByType);
// Document deletion & update route
router.delete('/vendor-documents/:documentId', (0, auth_middleware_1.authorizePermission)('vendors.edit'), vendor_controller_1.removeVendorDocument);
router.patch('/vendor-documents/:documentId/latest', (0, auth_middleware_1.authorizePermission)('vendors.edit'), vendor_controller_1.markVendorDocumentAsLatest);
exports.default = router;
