import { Router } from 'express';
import {
  getProjectedSales,
  getProjectedSaleById,
  createProjectedSale,
  updateProjectedSale,
  updateProjectedSaleStatus,
  deleteProjectedSale,
  addMilestone,
  updateMilestone,
  deleteMilestone
} from '../controllers/projectedSale.controller';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all Projected Sales routes
router.use(authenticate);

// Core CRUD routes
router.get('/', authorizePermission('projectedSales.view'), getProjectedSales);
router.post('/', authorizePermission('projectedSales.create'), createProjectedSale);
router.get('/:id', authorizePermission('projectedSales.view'), getProjectedSaleById);
router.put('/:id', authorizePermission('projectedSales.edit'), updateProjectedSale);
router.patch('/:id/status', authorizePermission('projectedSales.edit'), updateProjectedSaleStatus);
router.delete('/:id', authorizePermission('projectedSales.delete'), deleteProjectedSale);

// Milestone Level Sub-routes
router.post('/:id/milestones', authorizePermission('projectedSales.edit'), addMilestone);
router.put('/:id/milestones/:milestoneId', authorizePermission('projectedSales.edit'), updateMilestone);
router.delete('/:id/milestones/:milestoneId', authorizePermission('projectedSales.edit'), deleteMilestone);

export default router;
