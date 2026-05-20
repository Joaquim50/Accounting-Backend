import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizePermission } from '../middlewares/auth.middleware';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  updateRolePermissions,
  getModules
} from '../controllers/role.controller';

const router = Router();

// Protect all routes with auth middleware
router.use(authenticate);

// Modules list helper (placed before ID route to prevent conflicts)
router.get('/modules', authorizePermission('userManagement.view'), getModules);

// Role endpoints
router.get('/', authorizePermission('userManagement.view'), getRoles);
router.post('/', authorizePermission('userManagement.create'), createRole);
router.get('/:id', authorizePermission('userManagement.view'), getRoleById);
router.put('/:id', authorizePermission('userManagement.edit'), updateRole);
router.delete('/:id', authorizePermission('userManagement.delete'), deleteRole);

// Permission Matrix endpoint
router.put('/:id/permissions', authorizePermission('userManagement.edit'), updateRolePermissions);

export default router;
