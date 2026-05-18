import { Router } from 'express';
import {
  getEmployees,
  getEmployeeDropdown,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all employee routes
router.use(authenticate);

// Dropdown list route (placed before ID route to prevent routing collision)
router.get('/dropdown', getEmployeeDropdown);

// Core CRUD Employee routes
router.get('/', getEmployees);
router.post('/', createEmployee);
router.get('/:id', getEmployeeById);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;
