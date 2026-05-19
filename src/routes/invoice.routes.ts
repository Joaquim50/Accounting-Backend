import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { invoiceUpload } from '../middlewares/invoiceUpload.middleware';
import {
  // PI
  createPI,
  updatePI,
  deletePI,
  getPIById,
  getPIs,
  updatePIStatus,
  uploadPIFile,
  deletePIFile,
  recordPayment,
  getOutstandingPIs,
  getShortfallPIs,
  // TI
  generateTIFromPI,
  createDirectTI,
  updateTI,
  deleteTI,
  getTIById,
  getTIs,
  updateTIStatus,
  uploadTIFile,
  deleteTIFile
} from '../controllers/invoice.controller';

const router = Router();

// Secure all invoice routes
router.use(authenticate);

// ==========================================
// Proforma Invoice (PI) Routes
// ==========================================

router.post('/proforma', createPI);
router.get('/proforma', getPIs);
router.get('/proforma/outstanding', getOutstandingPIs);
router.get('/proforma/shortfall', getShortfallPIs);
router.get('/proforma/:id', getPIById);
router.put('/proforma/:id', updatePI);
router.delete('/proforma/:id', deletePI);
router.patch('/proforma/:id/status', updatePIStatus);
router.post('/proforma/:id/payment', recordPayment);

// File uploads for PI
router.post('/proforma/:id/file', invoiceUpload.single('file'), uploadPIFile);
router.delete('/proforma/:id/file', deletePIFile);

// ==========================================
// Tax Invoice (TI) Routes
// ==========================================

router.post('/tax/generate/:piId', generateTIFromPI); // From existing PI
router.post('/tax', createDirectTI); // Direct TI
router.get('/tax', getTIs);
router.get('/tax/:id', getTIById);
router.put('/tax/:id', updateTI);
router.delete('/tax/:id', deleteTI);
router.patch('/tax/:id/status', updateTIStatus);

// File uploads for TI
router.post('/tax/:id/file', invoiceUpload.single('file'), uploadTIFile);
router.delete('/tax/:id/file', deleteTIFile);

export default router;
