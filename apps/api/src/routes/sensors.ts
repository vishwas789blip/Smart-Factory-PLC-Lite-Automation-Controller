import { Router } from 'express';
import { Sensor } from '../models/Sensor';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { deviceId, factoryId } = req.query;
    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (factoryId) filter.factoryId = factoryId;
    const sensors = await Sensor.find(filter);
    res.json(sensors);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  try {
    const sensor = await Sensor.create(req.body);
    res.status(201).json(sensor);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.patch('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  try {
    const sensor = await Sensor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(sensor);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
