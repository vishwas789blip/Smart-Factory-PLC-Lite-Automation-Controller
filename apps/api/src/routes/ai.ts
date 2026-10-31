import { Router } from 'express';
import axios from 'axios';
import { AIInsight } from '../models/AIInsight';
import { requireAuth } from '../middleware/auth';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/anomaly', requireAuth, async (req, res) => {
  try {
    const response = await axios.post<Record<string, any>>(`${AI_SERVICE_URL}/detect-anomaly`, req.body, { timeout: 15000 });
    const result = response.data;
    if (result['anomaly']) {
      const insight = await AIInsight.create({
        type: 'ANOMALY',
        deviceId: req.body.deviceId,
        timestamp: new Date(),
        data: result,
        severity: result['severity'],
        acknowledged: false
      });
      res.json({ ...result, insightId: insight._id });
    } else {
      res.json(result);
    }
  } catch (e: any) {
    if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.response?.status === undefined) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }
    res.status(500).json({ error: 'AI service error' });
  }
});

router.post('/predict-power', requireAuth, async (req, res) => {
  try {
    const response = await axios.post<Record<string, any>>(`${AI_SERVICE_URL}/predict-power`, req.body, { timeout: 30000 });
    const result = response.data;
    await AIInsight.create({
      type: 'PREDICTION',
      deviceId: req.body.deviceId,
      timestamp: new Date(),
      data: result,
      severity: 'LOW',
      acknowledged: false
    });
    res.json(result);
  } catch (e: any) {
    if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.response?.status === undefined) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }
    res.status(500).json({ error: 'AI service error' });
  }
});

router.post('/optimize-load', requireAuth, async (req, res) => {
  try {
    const response = await axios.post<Record<string, any>>(`${AI_SERVICE_URL}/optimize-load`, req.body, { timeout: 15000 });
    const result = response.data;
    await AIInsight.create({
      type: 'OPTIMIZATION',
      deviceId: req.body.deviceId,
      timestamp: new Date(),
      data: result,
      severity: result['feasible'] ? 'MEDIUM' : 'HIGH',
      acknowledged: false
    });
    res.json(result);
  } catch (e: any) {
    if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.response?.status === undefined) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }
    res.status(500).json({ error: 'AI service error' });
  }
});

router.get('/insights', requireAuth, async (req, res) => {
  try {
    const { type, deviceId, limit } = req.query;
    const filter: Record<string, unknown> = {};
    if (type) filter['type'] = type;
    if (deviceId) filter['deviceId'] = deviceId;
    const insights = await AIInsight.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string) || 50);
    res.json(insights);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
