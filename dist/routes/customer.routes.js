"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_controller_1 = require("../controllers/customer.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all customer routes
router.use(auth_middleware_1.authenticate);
// Base customer routes
router.get('/', customer_controller_1.getCustomers);
router.post('/', customer_controller_1.createCustomer);
router.get('/:id', customer_controller_1.getCustomerById);
router.put('/:id', customer_controller_1.updateCustomer);
router.patch('/:id/status', customer_controller_1.updateCustomer);
router.delete('/:id', customer_controller_1.deleteCustomer);
// Logo upload route
router.post('/:id/logo', upload_middleware_1.upload.single('logo'), customer_controller_1.uploadCustomerLogo);
// Document specific routes nested under customer
router.get('/:id/documents', customer_controller_1.getCustomerDocuments);
router.post('/:id/documents', upload_middleware_1.upload.array('files', 10), customer_controller_1.uploadDocuments);
router.get('/:id/documents/:type', customer_controller_1.getCustomerDocumentsByType);
// Document operation routes
router.patch('/documents/:documentId/latest', customer_controller_1.markDocumentAsLatest);
router.delete('/documents/:documentId', customer_controller_1.removeDocument);
exports.default = router;
