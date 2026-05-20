"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const auth_middleware_2 = require("../middlewares/auth.middleware");
const role_controller_1 = require("../controllers/role.controller");
const router = (0, express_1.Router)();
// Protect all routes with auth middleware
router.use(auth_middleware_1.authenticate);
// Modules list helper (placed before ID route to prevent conflicts)
router.get('/modules', (0, auth_middleware_2.authorizePermission)('userManagement.view'), role_controller_1.getModules);
// Role endpoints
router.get('/', (0, auth_middleware_2.authorizePermission)('userManagement.view'), role_controller_1.getRoles);
router.post('/', (0, auth_middleware_2.authorizePermission)('userManagement.create'), role_controller_1.createRole);
router.get('/:id', (0, auth_middleware_2.authorizePermission)('userManagement.view'), role_controller_1.getRoleById);
router.put('/:id', (0, auth_middleware_2.authorizePermission)('userManagement.edit'), role_controller_1.updateRole);
router.delete('/:id', (0, auth_middleware_2.authorizePermission)('userManagement.delete'), role_controller_1.deleteRole);
// Permission Matrix endpoint
router.put('/:id/permissions', (0, auth_middleware_2.authorizePermission)('userManagement.edit'), role_controller_1.updateRolePermissions);
exports.default = router;
