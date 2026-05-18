import { Router } from 'express';
import { 
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  uploadDocuments,
  getCustomerDocuments,
  getCustomerDocumentsByType,
  removeDocument,
  markDocumentAsLatest,
  uploadCustomerLogo,
  getCustomerDropdown
} from '../controllers/customer.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Apply auth middleware to all customer routes
router.use(authenticate);

// Base customer routes
router.get('/', getCustomers);
router.get('/dropdown', getCustomerDropdown);
router.post('/', createCustomer);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);
router.patch('/:id/status', updateCustomer);
router.delete('/:id', deleteCustomer);

// Logo upload route
router.post('/:id/logo', upload.single('logo'), uploadCustomerLogo);

// Document specific routes nested under customer
router.get('/:id/documents', getCustomerDocuments);
router.post('/:id/documents', upload.array('files', 10), uploadDocuments);
router.get('/:id/documents/:type', getCustomerDocumentsByType);

// Document operation routes
router.patch('/documents/:documentId/latest', markDocumentAsLatest);
router.delete('/documents/:documentId', removeDocument);

export default router;
