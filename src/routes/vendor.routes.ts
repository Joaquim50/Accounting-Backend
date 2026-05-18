import { Router } from 'express';
import { 
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  updateVendorStatus,
  uploadVendorLogo,
  uploadVendorDocuments,
  getVendorDocuments,
  getVendorDocumentsByType,
  removeVendorDocument,
  markVendorDocumentAsLatest,
  getVendorDropdown
} from '../controllers/vendor.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { vendorUpload } from '../middlewares/vendorUpload.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Base vendor routes
router.get('/vendors', getVendors);
router.get('/vendors/dropdown', getVendorDropdown);
router.post('/vendors', createVendor);
router.get('/vendors/:id', getVendorById);
router.put('/vendors/:id', updateVendor);
router.patch('/vendors/:id/status', updateVendorStatus);
router.delete('/vendors/:id', deleteVendor);

// Logo upload route
router.post('/vendors/:id/logo', vendorUpload.single('logo'), uploadVendorLogo);

// Document specific routes nested under vendor
router.post('/vendors/:id/documents', vendorUpload.array('files', 10), uploadVendorDocuments);
router.get('/vendors/:id/documents', getVendorDocuments);
router.get('/vendors/:id/documents/:type', getVendorDocumentsByType);

// Document deletion & update route
router.delete('/vendor-documents/:documentId', removeVendorDocument);
router.patch('/vendor-documents/:documentId/latest', markVendorDocumentAsLatest);

export default router;
