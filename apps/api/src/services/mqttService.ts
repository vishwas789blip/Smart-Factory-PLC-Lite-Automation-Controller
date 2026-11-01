import mqtt from 'mqtt';
import { telemetryPayloadSchema } from '@smart-factory/validation';
import { Telemetry } from '../models/Telemetry';
import { Device } from '../models/Device';
import { Alert } from '../models/Alert';
import { Actuator } from '../models/Actuator';
import { TELEMETRY_SUBSCRIPTION, STATUS_SUBSCRIPTION, ACTUATOR_SUBSCRIPTION, extractDeviceIdFromTopic, extractActuatorIdFromTopic } from '@smart-factory/mqtt-contracts';
import { broadcastEvent } from './wsService';
import { evaluateAutomations } from './automationService';
import { ENV } from '../config/env';
import mongoose from 'mongoose';

const MQTT_HOST = ENV.MQTT_HOST;
const MQTT_PORT = ENV.MQTT_PORT;
const MQTT_USER = ENV.MQTT_USER;
const MQTT_PASSWORD = ENV.MQTT_PASSWORD;
const POWER_ALERT_THRESHOLD = ENV.POWER_ALERT_THRESHOLD;
const TEMP_ALERT_THRESHOLD = ENV.TEMP_ALERT_THRESHOLD;
const VIBRATION_ALERT_THRESHOLD = ENV.VIBRATION_ALERT_THRESHOLD;

const mqttOptions: mqtt.IClientOptions = {
  clientId: `api_${Math.random().toString(16).slice(2, 8)}`,
  reconnectPeriod: 5000
};

if (MQTT_USER && MQTT_PASSWORD) {
  mqttOptions.username = MQTT_USER;
  mqttOptions.password = MQTT_PASSWORD;
}

export const mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, mqttOptions);

export const checkAndCreateAlert = async (type: string, severity: string, deviceId: string, message: string, actuatorId?: string, machineId?: string) => {
  const query: any = { type, deviceId, resolvedAt: { $exists: false } };
  if (actuatorId) query.actuatorId = actuatorId;
  if (machineId) query.machineId = machineId;
  const existing = await Alert.findOne(query);
  if (!existing) {
    const alert = await Alert.create({ type, severity, deviceId, message, actuatorId, machineId, timestamp: new Date() });
    broadcastEvent({ type: 'alert', alert });
    return alert;
  }
  return existing;
};

mqttClient.on('connect', () => {
  console.log('[API MQTT] Backend connected to MQTT broker');
  mqttClient.subscribe(TELEMETRY_SUBSCRIPTION);
  mqttClient.subscribe(STATUS_SUBSCRIPTION);
  mqttClient.subscribe(ACTUATOR_SUBSCRIPTION);
});

mqttClient.on('error', (err) => {
  console.error('[API MQTT] Client error:', err.message);
});

mqttClient.on('offline', () => {
  console.warn('[API MQTT] Client went offline');
});

mqttClient.on('reconnect', () => {
  console.log('[API MQTT] Client attempting reconnection...');
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
        await checkAndCreateAlert('HIGH_TEMPERATURE', 'HIGH', deviceId, `Temp exceeded ${TEMP_ALERT_THRESHOLD}C`);
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
  try {
    if (mongoose.connection.readyState !== 1) return;
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
  } catch (err: any) {
    console.error('[API WATCHDOG] Error in offline/timeout check interval:', err.message);
  }
}, 30000);
