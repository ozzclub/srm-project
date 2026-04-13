import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api.types';
import { JwtPayload } from '../types/user.types';

// Use Role from JwtPayload to stay in sync with user.types.ts
type Role = JwtPayload['role'];

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        statusCode: 401,
      } as ApiResponse);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
        statusCode: 403,
      } as ApiResponse);
      return;
    }

    next();
  };
};
