import { Router } from 'express';
import { AuditLog } from '../models/AuditLog';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  try {
    const { action, userId, from, to, limit, page } = req.query;
    const filter: any = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to) filter.timestamp.$lte = new Date(to as string);
    }
    const lim = Math.min(parseInt(limit as string) || 50, 200);
    const skip = (parseInt(page as string) - 1 || 0) * lim;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).limit(lim).skip(skip),
      AuditLog.countDocuments(filter)
    ]);
    res.json({ logs, total, page: parseInt(page as string) || 1, limit: lim });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
