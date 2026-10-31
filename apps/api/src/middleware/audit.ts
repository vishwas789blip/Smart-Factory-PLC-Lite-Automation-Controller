import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';

export const logAudit = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function (body) {
      res.send = originalSend;
      const user = (req as any).user;
      const userId = user?.userId;
      const role = user?.role;
      
      const log = new AuditLog({
        userId,
        role,
        action,
        resource: req.originalUrl,
        result: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      log.save().catch(console.error);
      
      return res.send(body);
    };
    next();
  };
};
