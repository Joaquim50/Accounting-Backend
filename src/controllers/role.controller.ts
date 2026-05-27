import { Request, Response, NextFunction } from 'express';
import { RoleService, ALL_MODULES } from '../services/role.service';
import { createRoleSchema, updateRoleSchema, permissionMatrixSchema } from '../validators/role.validator';

// 1. Get all roles with permissions
export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await RoleService.getRoles();
    res.json({
      success: true,
      message: 'Roles retrieved successfully',
      data: roles
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get role by ID
export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const role = await RoleService.getRoleById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    res.json({
      success: true,
      message: 'Role retrieved successfully',
      data: role
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create role
export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createRoleSchema.parse(req.body);
    const role = await RoleService.createRole({
      roleName: validatedData.roleName,
      description: validatedData.description || '',
      isSystemRole: false
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// 4. Update role details (basic info)
export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const validatedData = updateRoleSchema.parse(req.body);
    const role = await RoleService.updateRole(id, validatedData);

    res.json({
      success: true,
      message: 'Role details updated successfully',
      data: role
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// 5. Delete role (soft or hard delete)
export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const isHardDelete = req.query.hard === 'true';
    const result = await RoleService.deleteRole(id, isHardDelete);
    res.json({
      success: true,
      message: result.type === 'HARD' ? 'Role permanently deleted' : 'Role soft deleted successfully'
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 6. Update role permissions matrix
export const updateRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = req.params.id as string;
    const validatedPermissions = permissionMatrixSchema.parse(req.body);
    const permissions = await RoleService.updateRolePermissions(roleId, validatedPermissions);

    res.json({
      success: true,
      message: 'Role permissions matrix updated successfully',
      data: permissions
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// 7. Get all system modules and permission types
export const getModules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      message: 'Modules retrieved successfully',
      data: ALL_MODULES
    });
  } catch (error) {
    next(error);
  }
};
