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
import { authenticate, authorizePermission } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Apply auth middleware to all customer routes
router.use(authenticate);

// Base customer routes
router.get('/', authorizePermission('customers.view'), getCustomers);
router.get('/dropdown', authorizePermission('customers.view'), getCustomerDropdown);
router.post('/', authorizePermission('customers.create'), createCustomer);
router.get('/:id', authorizePermission('customers.view'), getCustomerById);
router.put('/:id', authorizePermission('customers.edit'), updateCustomer);
router.patch('/:id/status', authorizePermission('customers.edit'), updateCustomer);
router.delete('/:id', authorizePermission('customers.delete'), deleteCustomer);

// Logo upload route
router.post('/:id/logo', authorizePermission('customers.edit'), upload.single('logo'), uploadCustomerLogo);

// Document specific routes nested under customer
router.get('/:id/documents', authorizePermission('customers.view'), getCustomerDocuments);
router.post('/:id/documents', authorizePermission('customers.edit'), upload.array('files', 10), uploadDocuments);
router.get('/:id/documents/:type', authorizePermission('customers.view'), getCustomerDocumentsByType);

// Document operation routes
router.patch('/documents/:documentId/latest', authorizePermission('customers.edit'), markDocumentAsLatest);
router.delete('/documents/:documentId', authorizePermission('customers.edit'), removeDocument);

export default router;
