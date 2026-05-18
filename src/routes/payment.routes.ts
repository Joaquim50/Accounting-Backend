import { Router } from 'express';
import {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
} from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to protect all payment routes
router.use(authenticate);

// Core Payment routing
router.get('/', getPayments);
router.post('/', createPayment);
router.get('/:id', getPaymentById);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

export default router;
