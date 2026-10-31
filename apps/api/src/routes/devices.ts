import { Router } from 'express';
import { Device } from '../models/Device';
import { Sensor } from '../models/Sensor';
import { Actuator } from '../models/Actuator';
import { Telemetry } from '../models/Telemetry';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { factoryId } = req.query;
    const filter: any = {};
    if (factoryId) filter.factoryId = factoryId;
    const devices = await Device.find(filter).sort({ deviceId: 1 });
    res.json(devices);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  try {
    const device = await Device.create(req.body);
    res.status(201).json(device);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.id });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const sensors = await Sensor.find({ deviceId: req.params.id });
    const actuators = await Actuator.find({ deviceId: req.params.id });
    const latestTelemetry = await Telemetry.findOne({ deviceId: req.params.id }).sort({ timestamp: -1 });
    res.json({ device, sensors, actuators, latestTelemetry });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.patch('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  try {
    const device = await Device.findOneAndUpdate({ deviceId: req.params.id }, req.body, { new: true });
    res.json(device);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    await Device.findOneAndDelete({ deviceId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
