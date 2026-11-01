import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';

// Attempt to load .env from several likely locations
const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../.env')
];

let loadedPath: string | null = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    loadedPath = p;
    break;
  }
}

if (!loadedPath) {
  dotenv.config(); // fallback to default dotenv resolution
}

// Enable Google/Cloudflare DNS fallback for MongoDB Atlas SRV resolution
try {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv://')) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
} catch {}

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-factory',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_dev_key_p180_factory_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_dev_p180_factory_2026',
  MQTT_HOST: process.env.MQTT_HOST || 'localhost',
  MQTT_PORT: parseInt(process.env.MQTT_PORT || '1883', 10),
  MQTT_USER: process.env.MQTT_USER || 'factory_backend',
  MQTT_PASSWORD: process.env.MQTT_PASSWORD || 'backend_secret_dev',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  ENERGY_TARIFF: parseFloat(process.env.ENERGY_TARIFF || '0.12'),
  POWER_ALERT_THRESHOLD: parseFloat(process.env.POWER_ALERT_THRESHOLD || '10'),
  TEMP_ALERT_THRESHOLD: parseFloat(process.env.TEMP_ALERT_THRESHOLD || '40'),
  VIBRATION_ALERT_THRESHOLD: parseFloat(process.env.VIBRATION_ALERT_THRESHOLD || '5')
};

