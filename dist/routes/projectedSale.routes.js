"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectedSale_controller_1 = require("../controllers/projectedSale.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all Projected Sales routes
router.use(auth_middleware_1.authenticate);
// Core CRUD routes
router.get('/', projectedSale_controller_1.getProjectedSales);
router.post('/', projectedSale_controller_1.createProjectedSale);
router.get('/:id', projectedSale_controller_1.getProjectedSaleById);
router.put('/:id', projectedSale_controller_1.updateProjectedSale);
router.patch('/:id/status', projectedSale_controller_1.updateProjectedSaleStatus);
router.delete('/:id', projectedSale_controller_1.deleteProjectedSale);
// Milestone Level Sub-routes
router.post('/:id/milestones', projectedSale_controller_1.addMilestone);
router.put('/:id/milestones/:milestoneId', projectedSale_controller_1.updateMilestone);
router.delete('/:id/milestones/:milestoneId', projectedSale_controller_1.deleteMilestone);
exports.default = router;
