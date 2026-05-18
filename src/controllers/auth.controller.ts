import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await prisma.user.findFirst({
      where: { email, isActive: true }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};
