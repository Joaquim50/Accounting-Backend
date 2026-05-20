"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billing_controller_1 = require("../controllers/billing.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Protect all billing routes with authentication
router.use(auth_middleware_1.authenticate);
/**
 * @route GET /api/billing/summary
 * @desc Get consolidated dashboard summary cards
 * @access Private
 */
router.get('/summary', (0, auth_middleware_1.authorizePermission)('dashboard.view'), billing_controller_1.getDashboardSummary);
/**
 * @route GET /api/billing
 * @desc Get consolidated, paginated and filtered billing tracker list
 * @access Private
 */
router.get('/', (0, auth_middleware_1.authorizePermission)('billingTracker.view'), billing_controller_1.getBillingTrackerList);
/**
 * @route GET /api/billing/:sourceType/:id
 * @desc Get original row details (Milestone, AMC Cycle, or Standalone Project)
 * @access Private
 */
router.get('/:sourceType/:id', (0, auth_middleware_1.authorizePermission)('billingTracker.view'), billing_controller_1.getRowDetails);
exports.default = router;
