import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { Actuator } from '../models/Actuator';
import { mqttClient } from '../services/mqttService';
import { getCommandTopic } from '@smart-factory/mqtt-contracts';
import { ActuatorCommand } from '@smart-factory/shared-types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/actuators
router.get('/', requireAuth, async (req, res) => {
  try {
    const { deviceId, factoryId } = req.query;
    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (factoryId) filter.factoryId = factoryId;
    const actuators = await Actuator.find(filter).sort({ actuatorId: 1 });
    res.json(actuators);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/actuators (create)
router.post('/', requireAuth, requireRole(['ENGINEER', 'ADMIN']), logAudit('ACTUATOR_CREATE'), async (req, res) => {
  try {
    const actuator = await Actuator.create(req.body);
    res.status(201).json(actuator);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/actuators/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const actuator = await Actuator.findOne({ actuatorId: req.params.id });
    if (!actuator) return res.status(404).json({ error: 'Actuator not found' });
    res.json(actuator);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/actuators/:id/command
router.post('/:id/command', requireAuth, requireRole(['OPERATOR', 'ENGINEER', 'ADMIN']), logAudit('ACTUATOR_COMMAND'), async (req, res) => {
  try {
    const { command, value, duration } = req.body;
    
    if (!command || !Object.values(ActuatorCommand).includes(command)) {
      return res.status(400).json({ 
        error: `Invalid command. Must be one of: ${Object.values(ActuatorCommand).join(', ')}` 
      });
    }

    const actuator = await Actuator.findOne({ actuatorId: req.params.id });
    if (!actuator) return res.status(404).json({ error: 'Actuator not found' });
    
    const commandId = uuidv4();
    const payload = {
      commandId,
      deviceId: actuator.deviceId,
      actuatorId: actuator.actuatorId,
      command,
      value: typeof value === 'number' ? value : undefined,
      duration: typeof duration === 'number' ? duration : undefined,
      timestamp: new Date().toISOString()
    };
    
    actuator.lastCommand = command;
    actuator.lastCommandId = commandId;
    actuator.lastCommandStatus = 'REQUESTED';
    await actuator.save();
    
    mqttClient.publish(getCommandTopic(actuator.deviceId), JSON.stringify(payload));
    
    actuator.lastCommandStatus = 'SENT';
    await actuator.save();
    
    res.json({ commandId, status: 'SENT', actuatorId: actuator.actuatorId });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
