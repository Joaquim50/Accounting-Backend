import { Router } from 'express';
import { getDashboardSummary, getBillingTrackerList, getRowDetails } from '../controllers/billing.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Protect all billing routes with authentication
router.use(authenticate);

/**
 * @route GET /api/billing/summary
 * @desc Get consolidated dashboard summary cards
 * @access Private
 */
router.get('/summary', getDashboardSummary);

/**
 * @route GET /api/billing
 * @desc Get consolidated, paginated and filtered billing tracker list
 * @access Private
 */
router.get('/', getBillingTrackerList);

/**
 * @route GET /api/billing/:sourceType/:id
 * @desc Get original row details (Milestone, AMC Cycle, or Standalone Project)
 * @access Private
 */
router.get('/:sourceType/:id', getRowDetails);

export default router;
