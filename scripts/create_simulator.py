import os

simulator_dir = r"C:\Users\vishw\.gemini\antigravity\scratch\smart-factory\simulator"

files = {
    "package.json": """{
  "name": "@smart-factory/simulator",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@smart-factory/shared-types": "*",
    "@smart-factory/mqtt-contracts": "*",
    "express": "^4.18.2",
    "mqtt": "^5.3.4",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
  }
}
""",
    "tsconfig.json": """{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "references": [
    { "path": "../packages/shared-types" },
    { "path": "../packages/mqtt-contracts" }
  ],
  "include": ["src/**/*"]
}
""",
    "src/index.ts": """import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mqtt from 'mqtt';
import { DeviceType, MachineState } from '@smart-factory/shared-types';
import { getTelemetryTopic, getStatusTopic, getActuatorTopic, getCommandTopic } from '@smart-factory/mqtt-contracts';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
let isRunning = false;
let isPaused = false;
let currentScenario = 'NORMAL';
let publishIntervalMs = 5000;
let publishTimer: NodeJS.Timeout | null = null;
let messagesSec = 0;
let messagesCount = 0;

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_USER = process.env.MQTT_SIM_USER || 'factory_simulator';
const MQTT_PASSWORD = process.env.MQTT_SIM_PASSWORD || 'simulator_secret_dev';

const client = mqtt.connect(`mqtt://${MQTT_HOST}:1883`, {
  username: MQTT_USER,
  password: MQTT_PASSWORD,
  clientId: `sim_${Math.random().toString(16).slice(2, 8)}`
});

const devices = ['plc-001', 'plc-002', 'plc-003'];

client.on('connect', () => {
  console.log('Simulator connected to MQTT');
  devices.forEach(d => {
    client.subscribe(getCommandTopic(d));
    client.publish(getStatusTopic(d), JSON.stringify({ status: 'ONLINE' }));
  });
});

client.on('message', (topic, message) => {
  console.log(`Command received on ${topic}:`, message.toString());
  // ACK logic simplified for phase 5 snippet
});

function generateTelemetry(deviceId: string) {
  const isPowerSpike = currentScenario === 'POWER_SPIKE';
  return {
    deviceId,
    timestamp: new Date().toISOString(),
    sequence: messagesCount++,
    source: 'simulator',
    electrical: {
      voltage: isPowerSpike ? 250 : 230 + (Math.random() * 4 - 2),
      current: isPowerSpike ? 50 : 10 + Math.random(),
      power: isPowerSpike ? 12 : 2.3 + Math.random() * 0.2,
      powerFactor: 0.95,
      energy: messagesCount * 0.01
    },
    environment: {
      temperature: 22 + Math.random(),
      humidity: 45 + Math.random(),
      smoke: 0,
      gas: 0
    },
    people: { count: 10 + Math.floor(Math.random() * 5) },
    machines: [
      {
        id: `m-${deviceId}`,
        state: MachineState.RUNNING,
        rpm: 1500 + Math.random() * 50,
        temperature: 45 + Math.random() * 5,
        vibration: 2 + Math.random(),
        current: 5 + Math.random(),
        power: 1.1,
        runtimeSeconds: messagesCount * 5
      }
    ]
  };
}

let lastPayload: any = null;

function publishLoop() {
  if (isRunning && !isPaused) {
    devices.forEach(d => {
      const payload = generateTelemetry(d);
      lastPayload = payload;
      client.publish(getTelemetryTopic(d), JSON.stringify(payload));
    });
    messagesSec = devices.length / (publishIntervalMs / 1000);
  }
}

app.get('/sim/status', (req, res) => {
  res.json({ isRunning, isPaused, currentScenario, messagesSec, publishIntervalMs });
});

app.post('/sim/start', (req, res) => {
  isRunning = true;
  if (!publishTimer) publishTimer = setInterval(publishLoop, publishIntervalMs);
  res.json({ status: 'started' });
});

app.post('/sim/stop', (req, res) => {
  isRunning = false;
  if (publishTimer) { clearInterval(publishTimer); publishTimer = null; }
  messagesSec = 0;
  res.json({ status: 'stopped' });
});

app.post('/sim/pause', (req, res) => {
  isPaused = true;
  res.json({ status: 'paused' });
});

app.post('/sim/resume', (req, res) => {
  isPaused = false;
  res.json({ status: 'resumed' });
});

app.post('/sim/scenario', (req, res) => {
  currentScenario = req.body.scenario || 'NORMAL';
  res.json({ scenario: currentScenario });
});

app.post('/sim/interval', (req, res) => {
  publishIntervalMs = req.body.intervalMs || 5000;
  if (publishTimer) {
    clearInterval(publishTimer);
    publishTimer = setInterval(publishLoop, publishIntervalMs);
  }
  res.json({ intervalMs: publishIntervalMs });
});

app.get('/sim/telemetry/latest', (req, res) => {
  res.json(lastPayload);
});

app.listen(PORT, () => {
  console.log(`Simulator listening on port ${PORT}`);
});
"""
}

for path, content in files.items():
    full_path = os.path.join(simulator_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

print("Generated Simulator")
