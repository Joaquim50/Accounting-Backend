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
  getVendorDropdown,
  bulkCreateVendors
} from '../controllers/vendor.controller';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware';
import { vendorUpload } from '../middlewares/vendorUpload.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Base vendor routes
router.get('/vendors', authorizePermission('vendors.view'), getVendors);
router.get('/vendors/dropdown', authorizePermission('vendors.view'), getVendorDropdown);
router.post('/vendors/bulk', authorizePermission('vendors.create'), bulkCreateVendors);
router.post('/vendors', authorizePermission('vendors.create'), createVendor);
router.get('/vendors/:id', authorizePermission('vendors.view'), getVendorById);
router.put('/vendors/:id', authorizePermission('vendors.edit'), updateVendor);
router.patch('/vendors/:id/status', authorizePermission('vendors.edit'), updateVendorStatus);
router.delete('/vendors/:id', authorizePermission('vendors.delete'), deleteVendor);

// Logo upload route
router.post('/vendors/:id/logo', authorizePermission('vendors.edit'), vendorUpload.single('logo'), uploadVendorLogo);

// Document specific routes nested under vendor
router.post('/vendors/:id/documents', authorizePermission('vendors.edit'), vendorUpload.array('files', 10), uploadVendorDocuments);
router.get('/vendors/:id/documents', authorizePermission('vendors.view'), getVendorDocuments);
router.get('/vendors/:id/documents/:type', authorizePermission('vendors.view'), getVendorDocumentsByType);

// Document deletion & update route
router.delete('/vendor-documents/:documentId', authorizePermission('vendors.edit'), removeVendorDocument);
router.patch('/vendor-documents/:documentId/latest', authorizePermission('vendors.edit'), markVendorDocumentAsLatest);

export default router;
