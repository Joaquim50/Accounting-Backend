"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const amc_controller_1 = require("../controllers/amc.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all AMC Tracker routes
router.use(auth_middleware_1.authenticate);
// Aggregations and global analytics (Positioned above :id paths to avoid match conflicts)
router.get('/upcoming', (0, auth_middleware_1.authorizePermission)('amcTracker.view'), amc_controller_1.getUpcomingBillingCycles);
router.get('/overdue', (0, auth_middleware_1.authorizePermission)('amcTracker.view'), amc_controller_1.getOverduePayments);
// Core AMC CRUD routes
router.get('/', (0, auth_middleware_1.authorizePermission)('amcTracker.view'), amc_controller_1.getAMCs);
router.post('/', (0, auth_middleware_1.authorizePermission)('amcTracker.create'), amc_controller_1.createAMC);
router.get('/:id', (0, auth_middleware_1.authorizePermission)('amcTracker.view'), amc_controller_1.getAMCById);
router.put('/:id', (0, auth_middleware_1.authorizePermission)('amcTracker.edit'), amc_controller_1.updateAMC);
router.patch('/:id/status', (0, auth_middleware_1.authorizePermission)('amcTracker.edit'), amc_controller_1.updateAMCStatus);
router.delete('/:id', (0, auth_middleware_1.authorizePermission)('amcTracker.delete'), amc_controller_1.deleteAMC);
// Cycle Level Operations
router.post('/:id/generate-cycles', (0, auth_middleware_1.authorizePermission)('amcTracker.edit'), amc_controller_1.generateBillingCycles);
router.put('/cycles/:cycleId/payment', (0, auth_middleware_1.authorizePermission)('amcTracker.edit'), amc_controller_1.updateBillingCyclePayment);
router.put('/cycles/:cycleId/pi-ti', (0, auth_middleware_1.authorizePermission)('amcTracker.edit'), amc_controller_1.updatePiTiStatus);
router.put('/cycles/:cycleId/match', (0, auth_middleware_1.authorizePermission)('amcTracker.approve'), amc_controller_1.markPaymentMatched);
exports.default = router;
