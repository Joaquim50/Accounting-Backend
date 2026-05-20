"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const user_controller_1 = require("../controllers/user.controller");
const router = (0, express_1.Router)();
// Protect all routes with auth
router.use(auth_middleware_1.authenticate);
// Self-service password change (any authenticated user can do this for themselves)
router.post('/change-password', user_controller_1.changePassword);
// Core User CRUD routes
router.get('/', (0, auth_middleware_1.authorizePermission)('userManagement.view'), user_controller_1.getUsers);
router.post('/', (0, auth_middleware_1.authorizePermission)('userManagement.create'), user_controller_1.createUser);
router.get('/:id', (0, auth_middleware_1.authorizePermission)('userManagement.view'), user_controller_1.getUserById);
router.put('/:id', (0, auth_middleware_1.authorizePermission)('userManagement.edit'), user_controller_1.updateUser);
router.delete('/:id', (0, auth_middleware_1.authorizePermission)('userManagement.delete'), user_controller_1.deleteUser);
// User status & administrative resets
router.put('/:id/status', (0, auth_middleware_1.authorizePermission)('userManagement.edit'), user_controller_1.updateUserStatus);
router.put('/:id/reset-password', (0, auth_middleware_1.authorizePermission)('userManagement.edit'), user_controller_1.resetPassword);
exports.default = router;
