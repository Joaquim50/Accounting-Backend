"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.changePasswordSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required').max(100, 'First name is too long'),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
    email: zod_1.z.string().email('Invalid email address').max(255),
    mobile: zod_1.z.string().max(20).optional().nullable(),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long'),
    roleId: zod_1.z.string().uuid('Invalid Role ID'),
});
exports.updateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required').max(100, 'First name is too long').optional(),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(100, 'Last name is too long').optional(),
    email: zod_1.z.string().email('Invalid email address').max(255).optional(),
    mobile: zod_1.z.string().max(20).optional().nullable(),
    roleId: zod_1.z.string().uuid('Invalid Role ID').optional(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1, 'Old password is required'),
    newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters long'),
});
exports.resetPasswordSchema = zod_1.z.object({
    newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters long'),
});
