"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.changePassword = exports.updateUserStatus = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getUsers = void 0;
const user_service_1 = require("../services/user.service");
const user_validator_1 = require("../validators/user.validator");
// 1. Get paginated and filtered users list
const getUsers = async (req, res, next) => {
    try {
        const { search, roleId, status, page, limit } = req.query;
        const result = await user_service_1.UserService.getUsers({
            search: search,
            roleId: roleId,
            status: status,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: result
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
// 2. Get user by ID
const getUserById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const user = await user_service_1.UserService.getUserById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User retrieved successfully',
            data: user
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserById = getUserById;
// 3. Create user (supporting profile picture upload)
const createUser = async (req, res, next) => {
    try {
        const currentUserId = req.user?.id;
        const parsedData = user_validator_1.createUserSchema.parse(req.body);
        const user = await user_service_1.UserService.createUser({
            firstName: parsedData.firstName,
            lastName: parsedData.lastName,
            email: parsedData.email,
            password: parsedData.password,
            mobile: parsedData.mobile,
            roleId: parsedData.roleId,
            createdBy: currentUserId,
        });
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.createUser = createUser;
// 4. Update user details
const updateUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        const currentUserId = req.user?.id;
        const parsedData = user_validator_1.updateUserSchema.parse(req.body);
        const user = await user_service_1.UserService.updateUser(id, {
            ...parsedData,
            updatedBy: currentUserId,
        });
        res.json({
            success: true,
            message: 'User details updated successfully',
            data: user
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateUser = updateUser;
// 5. Delete user (soft delete)
const deleteUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        await user_service_1.UserService.deleteUser(id);
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.deleteUser = deleteUser;
// 6. Update user active status (Activate / Deactivate)
const updateUserStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const currentUserId = req.user?.id;
        const { status } = req.body;
        if (!status || (status !== 'ACTIVE' && status !== 'INACTIVE')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Status must be ACTIVE or INACTIVE.'
            });
        }
        const user = await user_service_1.UserService.updateUserStatus(id, status, currentUserId);
        res.json({
            success: true,
            message: `User status changed to ${status} successfully`,
            data: user
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.updateUserStatus = updateUserStatus;
// 7. Change password (self-service)
const changePassword = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const parsedData = user_validator_1.changePasswordSchema.parse(req.body);
        await user_service_1.UserService.changePassword(userId, parsedData.oldPassword, parsedData.newPassword);
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.changePassword = changePassword;
// 8. Administrative password reset
const resetPassword = async (req, res, next) => {
    try {
        const id = req.params.id;
        const currentUserId = req.user?.id;
        const parsedData = user_validator_1.resetPasswordSchema.parse(req.body);
        await user_service_1.UserService.resetPassword(id, parsedData.newPassword, currentUserId);
        res.json({
            success: true,
            message: 'User password reset successfully'
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.resetPassword = resetPassword;
