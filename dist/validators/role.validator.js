"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionMatrixSchema = exports.updateRoleSchema = exports.createRoleSchema = void 0;
const zod_1 = require("zod");
exports.createRoleSchema = zod_1.z.object({
    roleName: zod_1.z.string().min(2, 'Role name must be at least 2 characters long').max(100),
    description: zod_1.z.string().max(255).optional().nullable(),
});
exports.updateRoleSchema = zod_1.z.object({
    roleName: zod_1.z.string().min(2, 'Role name must be at least 2 characters long').max(100).optional(),
    description: zod_1.z.string().max(255).optional().nullable(),
});
exports.permissionMatrixSchema = zod_1.z.array(zod_1.z.object({
    moduleName: zod_1.z.string().min(1, 'Module name is required'),
    canView: zod_1.z.boolean(),
    canCreate: zod_1.z.boolean(),
    canEdit: zod_1.z.boolean(),
    canDelete: zod_1.z.boolean(),
    canExport: zod_1.z.boolean(),
    canApprove: zod_1.z.boolean(),
}));
