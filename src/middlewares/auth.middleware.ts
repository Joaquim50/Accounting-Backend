import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

interface DecodedToken {
  id: string;
  role: string;
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
  if (req.user?.role !== 'Super Admin' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
  }
  next();
};

export const authorizePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
      }

      // Fetch user with role and its associated permissions
      const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user || user.status === 'INACTIVE') {
        return res.status(403).json({ success: false, message: 'User account is inactive or not found.' });
      }

      const role = user.role;
      if (!role) {
        return res.status(403).json({ success: false, message: 'Access denied. No role assigned to user.' });
      }

      // Super Admin bypasses all checks
      if (role.roleName === 'Super Admin') {
        return next();
      }

      // Parse the permission parameter (e.g. "customers.view")
      const [moduleName, action] = permission.split('.');
      if (!moduleName || !action) {
        return res.status(500).json({ success: false, message: 'Invalid permission check configuration' });
      }

      const rolePermission = role.permissions.find(
        (p) => p.moduleName.toLowerCase() === moduleName.toLowerCase()
      );

      if (!rolePermission) {
        return res.status(403).json({ success: false, message: `Access denied. No permission defined for module ${moduleName}` });
      }

      let hasPermission = false;
      switch (action.toLowerCase()) {
        case 'view':
          hasPermission = rolePermission.canView;
          break;
        case 'create':
          hasPermission = rolePermission.canCreate;
          break;
        case 'edit':
          hasPermission = rolePermission.canEdit;
          break;
        case 'delete':
          hasPermission = rolePermission.canDelete;
          break;
        case 'export':
          hasPermission = rolePermission.canExport;
          break;
        case 'approve':
          hasPermission = rolePermission.canApprove;
          break;
        default:
          return res.status(500).json({ success: false, message: `Invalid permission action: ${action}` });
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Lacking '${action}' permission on module '${moduleName}'`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

