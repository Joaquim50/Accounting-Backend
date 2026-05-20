"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to protect all payment routes
router.use(auth_middleware_1.authenticate);
// Core Payment routing
router.get('/', (0, auth_middleware_1.authorizePermission)('expenses.view'), payment_controller_1.getPayments);
router.post('/', (0, auth_middleware_1.authorizePermission)('expenses.create'), payment_controller_1.createPayment);
router.get('/:id', (0, auth_middleware_1.authorizePermission)('expenses.view'), payment_controller_1.getPaymentById);
router.put('/:id', (0, auth_middleware_1.authorizePermission)('expenses.edit'), payment_controller_1.updatePayment);
router.delete('/:id', (0, auth_middleware_1.authorizePermission)('expenses.delete'), payment_controller_1.deletePayment);
exports.default = router;
