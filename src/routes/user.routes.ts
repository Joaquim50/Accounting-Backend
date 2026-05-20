import { Router } from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  changePassword,
  resetPassword
} from '../controllers/user.controller';

const router = Router();

// Protect all routes with auth
router.use(authenticate);

// Self-service password change (any authenticated user can do this for themselves)
router.post('/change-password', changePassword);

// Core User CRUD routes
router.get('/', authorizePermission('userManagement.view'), getUsers);
router.post('/', authorizePermission('userManagement.create'), createUser);
router.get('/:id', authorizePermission('userManagement.view'), getUserById);
router.put('/:id', authorizePermission('userManagement.edit'), updateUser);
router.delete('/:id', authorizePermission('userManagement.delete'), deleteUser);

// User status & administrative resets
router.put('/:id/status', authorizePermission('userManagement.edit'), updateUserStatus);
router.put('/:id/reset-password', authorizePermission('userManagement.edit'), resetPassword);

export default router;
