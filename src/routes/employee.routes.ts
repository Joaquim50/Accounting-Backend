import { Router } from 'express';
import {
  getEmployees,
  getEmployeeDropdown,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all employee routes
router.use(authenticate);

// Dropdown list route (placed before ID route to prevent routing collision)
router.get('/dropdown', authorizePermission('employees.view'), getEmployeeDropdown);

// Core CRUD Employee routes
router.get('/', authorizePermission('employees.view'), getEmployees);
router.post('/', authorizePermission('employees.create'), createEmployee);
router.get('/:id', authorizePermission('employees.view'), getEmployeeById);
router.put('/:id', authorizePermission('employees.edit'), updateEmployee);
router.delete('/:id', authorizePermission('employees.delete'), deleteEmployee);

export default router;
