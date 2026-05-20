import { prisma } from '../db';
import { Role, Prisma } from '@prisma/client';

export const ALL_MODULES = [
  'dashboard',
  'customers',
  'vendors',
  'employees',
  'expenses',
  'projectedSales',
  'amcTracker',
  'proformaInvoice',
  'taxInvoice',
  'billingTracker',
  'userManagement',
  'settings'
];

export interface CreateRoleDto {
  roleName: string;
  description?: string | null;
  isSystemRole?: boolean;
}

export interface UpdateRoleDto {
  roleName?: string;
  description?: string | null;
}

export interface PermissionDto {
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canApprove: boolean;
}

export class RoleService {
  // 1. Get all roles with permissions
  static async getRoles() {
    return prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        permissions: {
          orderBy: { moduleName: 'asc' }
        }
      },
      orderBy: { roleName: 'asc' }
    });
  }

  // 2. Get role by ID
  static async getRoleById(id: string) {
    return prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: { permissions: true }
    });
  }

  // 3. Create role (and initialize all module permissions as false)
  static async createRole(data: CreateRoleDto) {
    return prisma.$transaction(async (tx) => {
      // Check if role name already exists
      const existing = await tx.role.findFirst({
        where: { roleName: data.roleName, deletedAt: null }
      });
      if (existing) {
        throw new Error('Role name already exists');
      }

      const role = await tx.role.create({
        data: {
          roleName: data.roleName,
          description: data.description || '',
          isSystemRole: data.isSystemRole || false,
        }
      });

      // Create empty permission entries for all modules
      const permissionData = ALL_MODULES.map(moduleName => ({
        roleId: role.id,
        moduleName,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canApprove: false,
      }));

      await tx.rolePermission.createMany({
        data: permissionData
      });

      return tx.role.findUnique({
        where: { id: role.id },
        include: { permissions: true }
      });
    });
  }

  // 4. Update role basic details
  static async updateRole(id: string, data: UpdateRoleDto) {
    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null }
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystemRole) {
      throw new Error('System roles cannot be modified');
    }

    if (data.roleName && data.roleName !== role.roleName) {
      const existing = await prisma.role.findFirst({
        where: { roleName: data.roleName, deletedAt: null }
      });
      if (existing) {
        throw new Error('Role name already exists');
      }
    }

    return prisma.role.update({
      where: { id },
      data
    });
  }

  // 5. Delete role (soft delete)
  static async deleteRole(id: string) {
    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null }
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystemRole) {
      throw new Error('System roles cannot be deleted');
    }

    // Check if any active user is assigned to this role
    const assignedUsers = await prisma.user.count({
      where: { roleId: id, deletedAt: null }
    });

    if (assignedUsers > 0) {
      throw new Error('Cannot delete role that is assigned to active users');
    }

    return prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  // 6. Update role permissions matrix
  static async updateRolePermissions(roleId: string, permissions: PermissionDto[]) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, deletedAt: null }
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.roleName === 'Super Admin') {
      throw new Error('Permissions for Super Admin cannot be customized (always full access)');
    }

    return prisma.$transaction(async (tx) => {
      for (const perm of permissions) {
        if (!ALL_MODULES.includes(perm.moduleName)) {
          throw new Error(`Invalid module name: ${perm.moduleName}`);
        }

        await tx.rolePermission.upsert({
          where: {
            roleId_moduleName: {
              roleId,
              moduleName: perm.moduleName
            }
          },
          update: {
            canView: perm.canView,
            canCreate: perm.canCreate,
            canEdit: perm.canEdit,
            canDelete: perm.canDelete,
            canExport: perm.canExport,
            canApprove: perm.canApprove,
          },
          create: {
            roleId,
            moduleName: perm.moduleName,
            canView: perm.canView,
            canCreate: perm.canCreate,
            canEdit: perm.canEdit,
            canDelete: perm.canDelete,
            canExport: perm.canExport,
            canApprove: perm.canApprove,
          }
        });
      }

      return tx.rolePermission.findMany({
        where: { roleId },
        orderBy: { moduleName: 'asc' }
      });
    });
  }
}
