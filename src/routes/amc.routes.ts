import { Router } from 'express';
import {
  createAMC,
  updateAMC,
  deleteAMC,
  getAMCById,
  getAMCs,
  updateAMCStatus,
  generateBillingCycles,
  updateBillingCyclePayment,
  updatePiTiStatus,
  markPaymentMatched,
  getUpcomingBillingCycles,
  getOverduePayments
} from '../controllers/amc.controller';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all AMC Tracker routes
router.use(authenticate);

// Aggregations and global analytics (Positioned above :id paths to avoid match conflicts)
router.get('/upcoming', authorizePermission('amcTracker.view'), getUpcomingBillingCycles);
router.get('/overdue', authorizePermission('amcTracker.view'), getOverduePayments);

// Core AMC CRUD routes
router.get('/', authorizePermission('amcTracker.view'), getAMCs);
router.post('/', authorizePermission('amcTracker.create'), createAMC);
router.get('/:id', authorizePermission('amcTracker.view'), getAMCById);
router.put('/:id', authorizePermission('amcTracker.edit'), updateAMC);
router.patch('/:id/status', authorizePermission('amcTracker.edit'), updateAMCStatus);
router.delete('/:id', authorizePermission('amcTracker.delete'), deleteAMC);

// Cycle Level Operations
router.post('/:id/generate-cycles', authorizePermission('amcTracker.edit'), generateBillingCycles);
router.put('/cycles/:cycleId/payment', authorizePermission('amcTracker.edit'), updateBillingCyclePayment);
router.put('/cycles/:cycleId/pi-ti', authorizePermission('amcTracker.edit'), updatePiTiStatus);
router.put('/cycles/:cycleId/match', authorizePermission('amcTracker.approve'), markPaymentMatched);

export default router;
