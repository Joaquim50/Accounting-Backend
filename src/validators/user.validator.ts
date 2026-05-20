import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  email: z.string().email('Invalid email address').max(255),
  mobile: z.string().max(20).optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  roleId: z.string().uuid('Invalid Role ID'),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long').optional(),
  email: z.string().email('Invalid email address').max(255).optional(),
  mobile: z.string().max(20).optional().nullable(),
  roleId: z.string().uuid('Invalid Role ID').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});
