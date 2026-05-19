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
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all Projected Sales routes
router.use(authenticate);

// Core CRUD routes
router.get('/', getProjectedSales);
router.post('/', createProjectedSale);
router.get('/:id', getProjectedSaleById);
router.put('/:id', updateProjectedSale);
router.patch('/:id/status', updateProjectedSaleStatus);
router.delete('/:id', deleteProjectedSale);

// Milestone Level Sub-routes
router.post('/:id/milestones', addMilestone);
router.put('/:id/milestones/:milestoneId', updateMilestone);
router.delete('/:id/milestones/:milestoneId', deleteMilestone);

export default router;
