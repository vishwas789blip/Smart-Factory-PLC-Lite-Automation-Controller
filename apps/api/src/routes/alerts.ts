import { Router } from 'express';
import { Alert } from '../models/Alert';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../middleware/audit';

const router = Router();

// GET /api/alerts - with filtering & pagination
router.get('/', requireAuth, async (req, res) => {
  try {
    const { severity, acknowledged, deviceId, from, to, limit } = req.query;
    const filter: any = {};

    if (severity) filter.severity = severity;
    if (deviceId) filter.deviceId = deviceId;
    if (acknowledged !== undefined) {
      filter.acknowledged = acknowledged === 'true';
    }
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to) filter.timestamp.$lte = new Date(to as string);
    }

    const lim = Math.min(parseInt(limit as string) || 100, 500);
    const alerts = await Alert.find(filter).sort({ timestamp: -1 }).limit(lim);
    res.json(alerts);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', requireAuth, requireRole(['OPERATOR', 'ENGINEER', 'ADMIN']), logAudit('ALERT_ACKNOWLEDGE'), async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id, 
      { acknowledged: true, acknowledgedBy: (req as any).user.userId },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ status: 'ACKNOWLEDGED', alert });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/alerts/:id/resolve
router.post('/:id/resolve', requireAuth, requireRole(['OPERATOR', 'ENGINEER', 'ADMIN']), logAudit('ALERT_RESOLVE'), async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id, 
      { resolvedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ status: 'RESOLVED', alert });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
