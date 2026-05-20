import { z } from 'zod';

export const createRoleSchema = z.object({
  roleName: z.string().min(2, 'Role name must be at least 2 characters long').max(100),
  description: z.string().max(255).optional().nullable(),
});

export const updateRoleSchema = z.object({
  roleName: z.string().min(2, 'Role name must be at least 2 characters long').max(100).optional(),
  description: z.string().max(255).optional().nullable(),
});

export const permissionMatrixSchema = z.array(
  z.object({
    moduleName: z.string().min(1, 'Module name is required'),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    canExport: z.boolean(),
    canApprove: z.boolean(),
  })
);
