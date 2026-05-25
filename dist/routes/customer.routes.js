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
router.get('/', (0, auth_middleware_1.authorizePermission)('customers.view'), customer_controller_1.getCustomers);
router.get('/dropdown', (0, auth_middleware_1.authorizePermission)('customers.view'), customer_controller_1.getCustomerDropdown);
router.post('/', (0, auth_middleware_1.authorizePermission)('customers.create'), customer_controller_1.createCustomer);
router.post('/bulk', (0, auth_middleware_1.authorizePermission)('customers.create'), customer_controller_1.bulkCreateCustomers);
router.get('/:id', (0, auth_middleware_1.authorizePermission)('customers.view'), customer_controller_1.getCustomerById);
router.put('/:id', (0, auth_middleware_1.authorizePermission)('customers.edit'), customer_controller_1.updateCustomer);
router.patch('/:id/status', (0, auth_middleware_1.authorizePermission)('customers.edit'), customer_controller_1.updateCustomer);
router.delete('/:id', (0, auth_middleware_1.authorizePermission)('customers.delete'), customer_controller_1.deleteCustomer);
// Logo upload route
router.post('/:id/logo', (0, auth_middleware_1.authorizePermission)('customers.edit'), upload_middleware_1.upload.single('logo'), customer_controller_1.uploadCustomerLogo);
// Document specific routes nested under customer
router.get('/:id/documents', (0, auth_middleware_1.authorizePermission)('customers.view'), customer_controller_1.getCustomerDocuments);
router.post('/:id/documents', (0, auth_middleware_1.authorizePermission)('customers.edit'), upload_middleware_1.upload.array('files', 10), customer_controller_1.uploadDocuments);
router.get('/:id/documents/:type', (0, auth_middleware_1.authorizePermission)('customers.view'), customer_controller_1.getCustomerDocumentsByType);
// Document operation routes
router.patch('/documents/:documentId/latest', (0, auth_middleware_1.authorizePermission)('customers.edit'), customer_controller_1.markDocumentAsLatest);
router.delete('/documents/:documentId', (0, auth_middleware_1.authorizePermission)('customers.edit'), customer_controller_1.removeDocument);
exports.default = router;
