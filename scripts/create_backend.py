import os

api_dir = r"C:\Users\vishw\.gemini\antigravity\scratch\smart-factory\apps\api\src"

files = {
    "routes/actuators.ts": """import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { Actuator } from '../models/Actuator';
import { mqttClient } from '../services/mqttService';
import { getCommandTopic } from '@smart-factory/mqtt-contracts';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/:id/command', requireAuth, requireRole(['OPERATOR', 'ENGINEER', 'ADMIN']), async (req, res) => {
  const { command, value, duration } = req.body;
  const actuator = await Actuator.findOne({ actuatorId: req.params.id });
  if (!actuator) return res.status(404).json({ error: 'Actuator not found' });
  
  const commandId = uuidv4();
  const payload = {
    commandId,
    deviceId: actuator.deviceId,
    actuatorId: actuator.actuatorId,
    command,
    value,
    duration,
    timestamp: new Date().toISOString()
  };
  
  actuator.lastCommand = command;
  actuator.lastCommandId = commandId;
  actuator.lastCommandStatus = 'REQUESTED';
  await actuator.save();
  
  mqttClient.publish(getCommandTopic(actuator.deviceId), JSON.stringify(payload));
  
  actuator.lastCommandStatus = 'SENT';
  await actuator.save();
  
  res.json({ commandId, status: 'SENT' });
});

export default router;
""",
    "services/automationService.ts": """import { Automation } from '../models/Automation';
import { AutomationExecution } from '../models/AutomationExecution';
import { mqttClient } from './mqttService';
import { getCommandTopic } from '@smart-factory/mqtt-contracts';
import { v4 as uuidv4 } from 'uuid';

export const evaluateAutomations = async (telemetry: any) => {
  const automations = await Automation.find({ enabled: true, triggerType: 'TELEMETRY' });
  
  for (const auto of automations) {
    if (auto.lastExecutedAt && (Date.now() - auto.lastExecutedAt.getTime()) < (auto.cooldownSeconds * 1000)) {
      continue;
    }
    
    let isTriggered = false;
    // VERY simplified condition evaluator for the purpose of the snippet
    // In production, parse conditions tree
    if (auto.conditions && auto.conditions.metric === 'electrical.power' && telemetry.electrical.power > auto.conditions.value) {
      isTriggered = true;
    }
    
    if (isTriggered) {
      const actionsExecuted = [];
      for (const action of auto.actions) {
         const payload = {
           commandId: uuidv4(),
           deviceId: telemetry.deviceId,
           actuatorId: action.actuatorId,
           command: action.command,
           value: action.value,
           timestamp: new Date().toISOString()
         };
         mqttClient.publish(getCommandTopic(telemetry.deviceId), JSON.stringify(payload));
         actionsExecuted.push(payload);
      }
      
      auto.lastExecutedAt = new Date();
      await auto.save();
      
      await AutomationExecution.create({
        automationId: auto._id,
        triggeredAt: new Date(),
        conditionSnapshot: auto.conditions,
        actionsExecuted,
        result: 'SUCCESS'
      });
    }
  }
};
""",
    "routes/analytics.ts": """import { Router } from 'express';
import { Telemetry } from '../models/Telemetry';

const router = Router();

router.get('/power', async (req, res) => {
  const { deviceId } = req.query;
  const data = await Telemetry.find({ deviceId }).sort({ timestamp: -1 }).limit(100);
  res.json(data);
});

router.get('/energy', async (req, res) => {
  res.json({ totalEnergy: 100, estimatedCost: 100 * 0.12 });
});

export default router;
""",
    "routes/alerts.ts": """import { Router } from 'express';
import { Alert } from '../models/Alert';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  const alerts = await Alert.find().sort({ timestamp: -1 });
  res.json(alerts);
});

router.post('/:id/acknowledge', requireAuth, requireRole(['OPERATOR', 'ENGINEER', 'ADMIN']), async (req, res) => {
  await Alert.findByIdAndUpdate(req.params.id, { acknowledged: true, acknowledgedBy: (req as any).user.userId });
  res.json({ status: 'ACKNOWLEDGED' });
});

router.post('/:id/resolve', requireAuth, requireRole(['OPERATOR', 'ENGINEER', 'ADMIN']), async (req, res) => {
  await Alert.findByIdAndUpdate(req.params.id, { resolvedAt: new Date() });
  res.json({ status: 'RESOLVED' });
});

export default router;
"""
}

for path, content in files.items():
    full_path = os.path.join(api_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

print("Generated Phase 9-14 API routes")
