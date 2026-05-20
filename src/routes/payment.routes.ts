import { Router } from 'express';
import {
  getPayments,
  getPaymentById,
  createPayment,
  bulkCreatePayments,
  updatePayment,
  deletePayment,
} from '../controllers/payment.controller';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to protect all payment routes
router.use(authenticate);

// Core Payment routing
router.get('/', authorizePermission('expenses.view'), getPayments);
router.post('/bulk', authorizePermission('expenses.create'), bulkCreatePayments);
router.post('/', authorizePermission('expenses.create'), createPayment);
router.get('/:id', authorizePermission('expenses.view'), getPaymentById);
router.put('/:id', authorizePermission('expenses.edit'), updatePayment);
router.delete('/:id', authorizePermission('expenses.delete'), deletePayment);

export default router;
