import os

api_dir = r"C:\Users\vishw\.gemini\antigravity\scratch\smart-factory\apps\api\src"

files = {
    "services/mqttService.ts": """import mqtt from 'mqtt';
import { telemetryPayloadSchema } from '@smart-factory/validation';
import { Telemetry } from '../models/Telemetry';
import { Device } from '../models/Device';
import { Alert } from '../models/Alert';
import { TELEMETRY_SUBSCRIPTION, STATUS_SUBSCRIPTION, ACTUATOR_SUBSCRIPTION, COMMAND_SUBSCRIPTION, extractDeviceIdFromTopic } from '@smart-factory/mqtt-contracts';

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USER = process.env.MQTT_USER || 'factory_backend';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'backend_secret_dev';

export const mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASSWORD,
  clientId: `api_${Math.random().toString(16).slice(2, 8)}`
});

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
      if (!result.success) {
        console.error(`Invalid telemetry from ${deviceId}:`, result.error);
        return;
      }
      
      const payload = result.data;
      
      // Save telemetry
      await Telemetry.create(payload);
      
      // Update last seen
      await Device.findOneAndUpdate({ deviceId }, { lastSeen: new Date(), status: 'ONLINE' });
      
      // We will add WS broadcast later in Phase 7
    } else if (topic.endsWith('/status')) {
      await Device.findOneAndUpdate({ deviceId }, { status: data.status, lastSeen: new Date() });
    }
  } catch (error) {
    console.error('MQTT message error:', error);
  }
});

// Device online/offline checker
setInterval(async () => {
  const cutoff = new Date(Date.now() - 60000); // 60 seconds
  
  const offlineDevices = await Device.find({ lastSeen: { $lt: cutoff }, status: 'ONLINE' });
  
  for (const device of offlineDevices) {
    device.status = 'OFFLINE';
    await device.save();
    
    await Alert.create({
      severity: 'HIGH',
      type: 'DEVICE_OFFLINE',
      message: `Device ${device.deviceId} is offline`,
      deviceId: device.deviceId,
      timestamp: new Date()
    });
  }
}, 30000);
"""
}

for path, content in files.items():
    full_path = os.path.join(api_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

print("Generated Phase 6 files")
