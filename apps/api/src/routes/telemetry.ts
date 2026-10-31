import { Router } from 'express';
import { Telemetry } from '../models/Telemetry';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { deviceId, from, to, limit } = req.query;
    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to) filter.timestamp.$lte = new Date(to as string);
    }
    const lim = Math.min(parseInt(limit as string) || 100, 1000);
    const data = await Telemetry.find(filter).sort({ timestamp: -1 }).limit(lim);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/latest', requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      // Return latest for each device
      const latest = await Telemetry.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$deviceId', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } }
      ]);
      return res.json(latest);
    }
    const data = await Telemetry.findOne({ deviceId }).sort({ timestamp: -1 });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/aggregate', requireAuth, async (req, res) => {
  try {
    const { deviceId, field, from, to } = req.query;
    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to) filter.timestamp.$lte = new Date(to as string);
    }
    const fieldPath = `$${field || 'electrical.power'}`;
    const result = await Telemetry.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        avg: { $avg: fieldPath },
        min: { $min: fieldPath },
        max: { $max: fieldPath },
        count: { $sum: 1 }
      }}
    ]);
    res.json(result[0] || { avg: 0, min: 0, max: 0, count: 0 });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
