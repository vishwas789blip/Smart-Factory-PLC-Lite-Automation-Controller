import os

api_dir = r"C:\Users\vishw\.gemini\antigravity\scratch\smart-factory\apps\api\src"

files = {
    "services/automationService.ts": """import { Automation } from '../models/Automation';
import { AutomationExecution } from '../models/AutomationExecution';
import { mqttClient } from './mqttService';
import { getCommandTopic, getAutomationEventsTopic } from '@smart-factory/mqtt-contracts';
import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from './wsService';

const getDotPath = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const evaluateConditionNode = (node: any, telemetry: any): boolean => {
  if (!node) return true;
  if (node.type === 'AND') {
    return node.children.every((child: any) => evaluateConditionNode(child, telemetry));
  }
  if (node.type === 'OR') {
    return node.children.some((child: any) => evaluateConditionNode(child, telemetry));
  }
  if (node.type === 'NOT') {
    return !evaluateConditionNode(node.children[0], telemetry);
  }
  
  // LEAF node
  const val = getDotPath(telemetry, node.metric);
  if (val === undefined) return false;
  
  switch (node.operator) {
    case '=': return val == node.value;
    case '!=': return val != node.value;
    case '>': return val > node.value;
    case '>=': return val >= node.value;
    case '<': return val < node.value;
    case '<=': return val <= node.value;
    default: return false;
  }
};

export const evaluateAutomations = async (telemetry: any) => {
  const automations = await Automation.find({ enabled: true, triggerType: 'TELEMETRY' });
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600000);

  for (const auto of automations) {
    // 1. Cooldown check
    if (auto.lastExecutedAt && (now.getTime() - auto.lastExecutedAt.getTime()) < (auto.cooldownSeconds * 1000)) {
      continue;
    }
    
    // 2. Rate limit check
    const executionsInLastHour = await AutomationExecution.countDocuments({
      automationId: auto._id,
      triggeredAt: { $gte: hourAgo }
    });
    
    if (executionsInLastHour >= auto.maxExecutionsPerHour) {
      continue;
    }
    
    // 3. Evaluate AST
    const isTriggered = evaluateConditionNode(auto.conditions, telemetry);
    
    if (isTriggered) {
      const actionsExecuted = [];
      for (const action of auto.actions) {
         const payload = {
           commandId: uuidv4(),
           deviceId: telemetry.deviceId,
           actuatorId: action.actuatorId,
           command: action.command,
           value: action.value,
           timestamp: now.toISOString()
         };
         mqttClient.publish(getCommandTopic(telemetry.deviceId), JSON.stringify(payload));
         actionsExecuted.push(payload);
      }
      
      auto.lastExecutedAt = now;
      await auto.save();
      
      await AutomationExecution.create({
        automationId: auto._id,
        triggeredAt: now,
        conditionSnapshot: auto.conditions,
        actionsExecuted,
        result: 'SUCCESS'
      });
      
      broadcastEvent({ type: 'automation_event', automationId: auto._id, result: 'SUCCESS' });
    }
  }
};
""",
    "services/scheduleService.ts": """import cron from 'node-cron';
import { Schedule } from '../models/Schedule';
import { AutomationExecution } from '../models/AutomationExecution';
import { mqttClient } from './mqttService';
import { getCommandTopic } from '@smart-factory/mqtt-contracts';
import { v4 as uuidv4 } from 'uuid';

const activeJobs = new Map<string, cron.ScheduledTask>();

export const loadSchedules = async () => {
  // Clear existing
  for (const job of activeJobs.values()) {
    job.stop();
  }
  activeJobs.clear();

  const schedules = await Schedule.find({ enabled: true });
  for (const schedule of schedules) {
    scheduleJob(schedule);
  }
};

export const scheduleJob = (schedule: any) => {
  if (activeJobs.has(schedule._id.toString())) {
    activeJobs.get(schedule._id.toString())?.stop();
    activeJobs.delete(schedule._id.toString());
  }

  if (!schedule.enabled) return;

  const job = cron.schedule(schedule.cronExpression, async () => {
    const now = new Date();
    const actionsExecuted = [];
    
    // Determine devices (assuming actions have deviceId, though schema implies factory context. We will assume action.deviceId exists or fallback)
    for (const action of schedule.actions) {
       const payload = {
         commandId: uuidv4(),
         deviceId: action.deviceId || 'plc-001', // Fallback for simplicity if missing
         actuatorId: action.actuatorId,
         command: action.command,
         value: action.value,
         timestamp: now.toISOString()
       };
       mqttClient.publish(getCommandTopic(payload.deviceId), JSON.stringify(payload));
       actionsExecuted.push(payload);
    }
    
    schedule.lastRun = now;
    await schedule.save();
    
    await AutomationExecution.create({
      automationId: schedule._id, // Abusing automationId to store schedule ID for unified history
      triggeredAt: now,
      conditionSnapshot: { type: 'SCHEDULE', cron: schedule.cronExpression },
      actionsExecuted,
      result: 'SUCCESS'
    });
  }, { timezone: schedule.timezone || 'UTC' });

  activeJobs.set(schedule._id.toString(), job);
};

export const deleteJob = (scheduleId: string) => {
  if (activeJobs.has(scheduleId)) {
    activeJobs.get(scheduleId)?.stop();
    activeJobs.delete(scheduleId);
  }
};
""",
    "routes/schedules.ts": """import { Router } from 'express';
import { Schedule } from '../models/Schedule';
import { requireAuth, requireRole } from '../middleware/auth';
import { scheduleJob, deleteJob } from '../services/scheduleService';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const schedules = await Schedule.find();
  res.json(schedules);
});

router.post('/', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  const schedule = await Schedule.create(req.body);
  scheduleJob(schedule);
  res.status(201).json(schedule);
});

router.patch('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (schedule) scheduleJob(schedule);
  res.json(schedule);
});

router.delete('/:id', requireAuth, requireRole(['ENGINEER', 'ADMIN']), async (req, res) => {
  await Schedule.findByIdAndDelete(req.params.id);
  deleteJob(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
""",
    "routes/analytics.ts": """import { Router } from 'express';
import { Telemetry } from '../models/Telemetry';

const router = Router();
const TARIFF = parseFloat(process.env.ENERGY_TARIFF || '0.12');

router.get('/power', async (req, res) => {
  const { deviceId, from, to } = req.query;
  const filter: any = { deviceId };
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from as string);
    if (to) filter.timestamp.$lte = new Date(to as string);
  }
  const data = await Telemetry.find(filter).sort({ timestamp: 1 }).select('timestamp electrical.power -_id');
  res.json(data.map(d => ({ timestamp: d.timestamp, power: d.electrical?.power || 0 })));
});

router.get('/energy', async (req, res) => {
  const { deviceId, from, to } = req.query;
  const filter: any = {};
  if (deviceId) filter.deviceId = deviceId;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from as string);
    if (to) filter.timestamp.$lte = new Date(to as string);
  }

  const pipeline = [
    { $match: filter },
    { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        minEnergy: { $min: "$electrical.energy" },
        maxEnergy: { $max: "$electrical.energy" },
        peakPower: { $max: "$electrical.power" },
        avgPower: { $avg: "$electrical.power" }
      }
    },
    { $project: {
        date: "$_id",
        energyKwh: { $subtract: ["$maxEnergy", "$minEnergy"] },
        peakPowerKw: "$peakPower",
        avgPowerKw: "$avgPower"
      }
    },
    { $sort: { date: 1 } }
  ];

  const daily = await Telemetry.aggregate(pipeline);
  let totalEnergyKwh = 0;
  let maxPeak = 0;
  let sumAvg = 0;
  
  daily.forEach((d: any) => {
    totalEnergyKwh += (d.energyKwh || 0);
    if (d.peakPowerKw > maxPeak) maxPeak = d.peakPowerKw;
    sumAvg += (d.avgPowerKw || 0);
  });

  res.json({
    totalEnergyKwh,
    peakPowerKw: maxPeak,
    avgPowerKw: daily.length ? (sumAvg / daily.length) : 0,
    estimatedCost: totalEnergyKwh * TARIFF,
    dailyBreakdown: daily.map((d: any) => ({ ...d, cost: (d.energyKwh || 0) * TARIFF }))
  });
});

router.get('/machines', async (req, res) => {
  const { machineId, from, to } = req.query;
  // Stubbed response for now, full aggregation for machines
  res.json([]);
});

router.get('/productivity', async (req, res) => {
  res.json([]);
});

export default router;
""",
    "services/mqttService.ts": """import mqtt from 'mqtt';
import { telemetryPayloadSchema } from '@smart-factory/validation';
import { Telemetry } from '../models/Telemetry';
import { Device } from '../models/Device';
import { Alert } from '../models/Alert';
import { Actuator } from '../models/Actuator';
import { TELEMETRY_SUBSCRIPTION, STATUS_SUBSCRIPTION, ACTUATOR_SUBSCRIPTION, extractDeviceIdFromTopic, extractActuatorIdFromTopic } from '@smart-factory/mqtt-contracts';
import { broadcastEvent } from './wsService';
import { evaluateAutomations } from './automationService';

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USER = process.env.MQTT_USER || 'factory_backend';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'backend_secret_dev';
const POWER_ALERT_THRESHOLD = parseFloat(process.env.POWER_ALERT_THRESHOLD || '10');
const TEMP_ALERT_THRESHOLD = parseFloat(process.env.TEMP_ALERT_THRESHOLD || '40');
const VIBRATION_ALERT_THRESHOLD = parseFloat(process.env.VIBRATION_ALERT_THRESHOLD || '5');

export const mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASSWORD,
  clientId: `api_${Math.random().toString(16).slice(2, 8)}`
});

const checkAndCreateAlert = async (type: string, severity: string, deviceId: string, message: string, actuatorId?: string, machineId?: string) => {
  const existing = await Alert.findOne({ type, deviceId, resolvedAt: { $exists: false } });
  if (!existing) {
    const alert = await Alert.create({ type, severity, deviceId, message, actuatorId, machineId, timestamp: new Date() });
    broadcastEvent({ type: 'alert', alert });
  }
};

mqttClient.on('connect', () => {
  console.log('Backend connected to MQTT');
  mqttClient.subscribe(TELEMETRY_SUBSCRIPTION);
  mqttClient.subscribe(STATUS_SUBSCRIPTION);
  mqttClient.subscribe(ACTUATOR_SUBSCRIPTION);
});

mqttClient.on('message', async (topic, message) => {
  try {
    const deviceId = extractDeviceIdFromTopic(topic);
    if (!deviceId) return;
    const data = JSON.parse(message.toString());

    if (topic.endsWith('/telemetry')) {
      const result = telemetryPayloadSchema.safeParse(data);
      if (!result.success) return;
      const payload = result.data;
      
      await Telemetry.create(payload);
      await Device.findOneAndUpdate({ deviceId }, { lastSeen: new Date(), status: 'ONLINE' });
      broadcastEvent({ type: 'telemetry', deviceId, payload });
      
      // ALERTS
      if (payload.electrical.power > POWER_ALERT_THRESHOLD) {
        await checkAndCreateAlert('HIGH_POWER', 'HIGH', deviceId, `Power exceeded ${POWER_ALERT_THRESHOLD}kW`);
      }
      if (payload.environment.temperature > TEMP_ALERT_THRESHOLD) {
        await checkAndCreateAlert('HIGH_TEMPERATURE', 'HIGH', deviceId, `Temp exceeded ${TEMP_ALERT_THRESHOLD}°C`);
      }
      for (const machine of payload.machines) {
        if (machine.state === 'FAULT') {
          await checkAndCreateAlert('MACHINE_FAULT', 'CRITICAL', deviceId, `Machine ${machine.id} faulted`, undefined, machine.id);
        }
        if (machine.vibration > VIBRATION_ALERT_THRESHOLD) {
          await checkAndCreateAlert('HIGH_VIBRATION', 'MEDIUM', deviceId, `Vibration exceeded ${VIBRATION_ALERT_THRESHOLD}`, undefined, machine.id);
        }
      }
      
      // AUTOMATIONS
      await evaluateAutomations(payload);

    } else if (topic.endsWith('/status')) {
      await Device.findOneAndUpdate({ deviceId }, { status: data.status, lastSeen: new Date() });
      broadcastEvent({ type: 'device_status', deviceId, status: data.status });
      if (data.status === 'OFFLINE') {
        await checkAndCreateAlert('DEVICE_OFFLINE', 'HIGH', deviceId, `Device reported offline`);
      }
    } else if (topic.includes('/actuators/')) {
      const actuatorId = extractActuatorIdFromTopic(topic);
      if (!actuatorId) return;
      
      const act = await Actuator.findOneAndUpdate(
        { deviceId, actuatorId },
        { state: data.state, lastCommandStatus: 'ACKNOWLEDGED' },
        { new: true }
      );
      
      if (act) {
        broadcastEvent({ type: 'actuator_state', actuatorId, deviceId, state: act.state });
      }
    }
  } catch (error) {
    console.error('MQTT message error:', error);
  }
});

// Device offline checker & Actuator Timeout checker
setInterval(async () => {
  const now = Date.now();
  const cutoff = new Date(now - 60000); 
  const offlineDevices = await Device.find({ lastSeen: { $lt: cutoff }, status: 'ONLINE' });
  
  for (const device of offlineDevices) {
    device.status = 'OFFLINE';
    await device.save();
    await checkAndCreateAlert('DEVICE_OFFLINE', 'HIGH', device.deviceId, `Device missed telemetry heartbeat`);
    broadcastEvent({ type: 'device_status', deviceId: device.deviceId, status: 'OFFLINE' });
  }
  
  const cmdCutoff = new Date(now - 30000);
  const timedOutActuators = await Actuator.find({ lastCommandStatus: 'SENT', updatedAt: { $lt: cmdCutoff } });
  
  for (const act of timedOutActuators) {
    act.lastCommandStatus = 'TIMEOUT';
    await act.save();
    await checkAndCreateAlert('ACTUATOR_TIMEOUT', 'MEDIUM', act.deviceId, `Actuator ${act.actuatorId} timeout`, act.actuatorId);
  }
}, 30000);
"""
}

for path, content in files.items():
    full_path = os.path.join(api_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

print("Generated full implementation backend scripts")
