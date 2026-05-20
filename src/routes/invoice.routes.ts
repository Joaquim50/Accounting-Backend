import { Router } from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware';
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

router.post('/proforma', authorizePermission('proformaInvoice.create'), createPI);
router.get('/proforma', authorizePermission('proformaInvoice.view'), getPIs);
router.get('/proforma/outstanding', authorizePermission('proformaInvoice.view'), getOutstandingPIs);
router.get('/proforma/shortfall', authorizePermission('proformaInvoice.view'), getShortfallPIs);
router.get('/proforma/:id', authorizePermission('proformaInvoice.view'), getPIById);
router.put('/proforma/:id', authorizePermission('proformaInvoice.edit'), updatePI);
router.delete('/proforma/:id', authorizePermission('proformaInvoice.delete'), deletePI);
router.patch('/proforma/:id/status', authorizePermission('proformaInvoice.approve'), updatePIStatus);
router.post('/proforma/:id/payment', authorizePermission('proformaInvoice.edit'), recordPayment);

// File uploads for PI
router.post('/proforma/:id/file', authorizePermission('proformaInvoice.edit'), invoiceUpload.single('file'), uploadPIFile);
router.delete('/proforma/:id/file', authorizePermission('proformaInvoice.edit'), deletePIFile);

// ==========================================
// Tax Invoice (TI) Routes
// ==========================================

router.post('/tax/generate/:piId', authorizePermission('taxInvoice.create'), generateTIFromPI); // From existing PI
router.post('/tax', authorizePermission('taxInvoice.create'), createDirectTI); // Direct TI
router.get('/tax', authorizePermission('taxInvoice.view'), getTIs);
router.get('/tax/:id', authorizePermission('taxInvoice.view'), getTIById);
router.put('/tax/:id', authorizePermission('taxInvoice.edit'), updateTI);
router.delete('/tax/:id', authorizePermission('taxInvoice.delete'), deleteTI);
router.patch('/tax/:id/status', authorizePermission('taxInvoice.approve'), updateTIStatus);

// File uploads for TI
router.post('/tax/:id/file', authorizePermission('taxInvoice.edit'), invoiceUpload.single('file'), uploadTIFile);
router.delete('/tax/:id/file', authorizePermission('taxInvoice.edit'), deleteTIFile);

export default router;
