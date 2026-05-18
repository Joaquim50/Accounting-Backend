import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  id: string;
  role: 'SUPER_ADMIN' | 'USER';
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized. Invalid or expired token.' });
  }
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
  }
  next();
};
