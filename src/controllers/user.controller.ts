import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { createUserSchema, updateUserSchema, changePasswordSchema, resetPasswordSchema } from '../validators/user.validator';
import { UserStatus } from '@prisma/client';

// 1. Get paginated and filtered users list
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, roleId, status, page, limit } = req.query;

    const result = await UserService.getUsers({
      search: search as string,
      roleId: roleId as string,
      status: status as UserStatus,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get user by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = await UserService.getUserById(id);

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
  } catch (error) {
    next(error);
  }
};

// 3. Create user (supporting profile picture upload)
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.id;
    const parsedData = createUserSchema.parse(req.body);

    const user = await UserService.createUser({
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
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// 4. Update user details
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const currentUserId = req.user?.id;
    const parsedData = updateUserSchema.parse(req.body);

    const user = await UserService.updateUser(id, {
      ...parsedData,
      updatedBy: currentUserId,
    });

    res.json({
      success: true,
      message: 'User details updated successfully',
      data: user
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// 5. Delete user (soft delete)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await UserService.deleteUser(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 6. Update user active status (Activate / Deactivate)
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const currentUserId = req.user?.id;
    const { status } = req.body;

    if (!status || (status !== 'ACTIVE' && status !== 'INACTIVE')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status must be ACTIVE or INACTIVE.'
      });
    }

    const user = await UserService.updateUserStatus(id, status as UserStatus, currentUserId);

    res.json({
      success: true,
      message: `User status changed to ${status} successfully`,
      data: user
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 7. Change password (self-service)
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const parsedData = changePasswordSchema.parse(req.body);
    await UserService.changePassword(userId, parsedData.oldPassword, parsedData.newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// 8. Administrative password reset
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const currentUserId = req.user?.id;
    const parsedData = resetPasswordSchema.parse(req.body);

    await UserService.resetPassword(id, parsedData.newPassword, currentUserId);

    res.json({
      success: true,
      message: 'User password reset successfully'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};
