"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModules = exports.updateRolePermissions = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoleById = exports.getRoles = void 0;
const role_service_1 = require("../services/role.service");
const role_validator_1 = require("../validators/role.validator");
// 1. Get all roles with permissions
const getRoles = async (req, res, next) => {
    try {
        const roles = await role_service_1.RoleService.getRoles();
        res.json({
            success: true,
            message: 'Roles retrieved successfully',
            data: roles
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getRoles = getRoles;
// 2. Get role by ID
const getRoleById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const role = await role_service_1.RoleService.getRoleById(id);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getRoleById = getRoleById;
// 3. Create role
const createRole = async (req, res, next) => {
    try {
        const validatedData = role_validator_1.createRoleSchema.parse(req.body);
        const role = await role_service_1.RoleService.createRole({
            roleName: validatedData.roleName,
            description: validatedData.description || '',
            isSystemRole: false
        });
        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: role
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.createRole = createRole;
// 4. Update role details (basic info)
const updateRole = async (req, res, next) => {
    try {
        const id = req.params.id;
        const validatedData = role_validator_1.updateRoleSchema.parse(req.body);
        const role = await role_service_1.RoleService.updateRole(id, validatedData);
        res.json({
            success: true,
            message: 'Role details updated successfully',
            data: role
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateRole = updateRole;
// 5. Delete role (soft or hard delete)
const deleteRole = async (req, res, next) => {
    try {
        const id = req.params.id;
        const isHardDelete = req.query.hard === 'true';
        const result = await role_service_1.RoleService.deleteRole(id, isHardDelete);
        res.json({
            success: true,
            message: result.type === 'HARD' ? 'Role permanently deleted' : 'Role soft deleted successfully'
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.deleteRole = deleteRole;
// 6. Update role permissions matrix
const updateRolePermissions = async (req, res, next) => {
    try {
        const roleId = req.params.id;
        const validatedPermissions = role_validator_1.permissionMatrixSchema.parse(req.body);
        const permissions = await role_service_1.RoleService.updateRolePermissions(roleId, validatedPermissions);
        res.json({
            success: true,
            message: 'Role permissions matrix updated successfully',
            data: permissions
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateRolePermissions = updateRolePermissions;
// 7. Get all system modules and permission types
const getModules = async (req, res, next) => {
    try {
        res.json({
            success: true,
            message: 'Modules retrieved successfully',
            data: role_service_1.ALL_MODULES
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getModules = getModules;
