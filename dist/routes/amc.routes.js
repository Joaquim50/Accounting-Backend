"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const amc_controller_1 = require("../controllers/amc.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all AMC Tracker routes
router.use(auth_middleware_1.authenticate);
// Aggregations and global analytics (Positioned above :id paths to avoid match conflicts)
router.get('/upcoming', amc_controller_1.getUpcomingBillingCycles);
router.get('/overdue', amc_controller_1.getOverduePayments);
// Core AMC CRUD routes
router.get('/', amc_controller_1.getAMCs);
router.post('/', amc_controller_1.createAMC);
router.get('/:id', amc_controller_1.getAMCById);
router.put('/:id', amc_controller_1.updateAMC);
router.patch('/:id/status', amc_controller_1.updateAMCStatus);
router.delete('/:id', amc_controller_1.deleteAMC);
// Cycle Level Operations
router.post('/:id/generate-cycles', amc_controller_1.generateBillingCycles);
router.put('/cycles/:cycleId/payment', amc_controller_1.updateBillingCyclePayment);
router.put('/cycles/:cycleId/pi-ti', amc_controller_1.updatePiTiStatus);
router.put('/cycles/:cycleId/match', amc_controller_1.markPaymentMatched);
exports.default = router;
