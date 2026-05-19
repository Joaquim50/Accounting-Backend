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
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all AMC Tracker routes
router.use(authenticate);

// Aggregations and global analytics (Positioned above :id paths to avoid match conflicts)
router.get('/upcoming', getUpcomingBillingCycles);
router.get('/overdue', getOverduePayments);

// Core AMC CRUD routes
router.get('/', getAMCs);
router.post('/', createAMC);
router.get('/:id', getAMCById);
router.put('/:id', updateAMC);
router.patch('/:id/status', updateAMCStatus);
router.delete('/:id', deleteAMC);

// Cycle Level Operations
router.post('/:id/generate-cycles', generateBillingCycles);
router.put('/cycles/:cycleId/payment', updateBillingCyclePayment);
router.put('/cycles/:cycleId/pi-ti', updatePiTiStatus);
router.put('/cycles/:cycleId/match', markPaymentMatched);

export default router;
