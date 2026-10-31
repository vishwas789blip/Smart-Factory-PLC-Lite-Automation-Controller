import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mqtt, { MqttClient } from 'mqtt';
import { MachineState } from '@smart-factory/shared-types';
import {
  getTelemetryTopic,
  getStatusTopic,
  getActuatorTopic,
  getCommandTopic
} from '@smart-factory/mqtt-contracts';

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../.env')
];
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.SIMULATOR_PORT || '5000');
const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883');
const MQTT_USER = process.env.MQTT_SIM_USER || 'factory_simulator';
const MQTT_PASSWORD = process.env.MQTT_SIM_PASSWORD || 'simulator_secret_dev';

// ─── Machine State Machine ───────────────────────────────────────────────────
interface MachineSimState {
  id: string;
  name: string;
  state: MachineState;
  rpm: number;
  temperature: number;
  vibration: number;
  current: number;
  power: number;
  runtimeSeconds: number;
  idleSeconds: number;
  stateTimer: number; // seconds in current state
  faultCooldown: number;
  nominalRpm: number;
  nominalCurrent: number;
  nominalPower: number;
}

// ─── Actuator State ───────────────────────────────────────────────────────────
interface ActuatorSimState {
  actuatorId: string;
  deviceId: string;
  type: string;
  state: string;
}

// ─── Device Simulation ───────────────────────────────────────────────────────
interface DeviceSimState {
  deviceId: string;
  machines: MachineSimState[];
  actuators: ActuatorSimState[];
  energyAccumulator: number; // kWh
  peopleCount: number;
  envTemperature: number;
  envHumidity: number;
  smoke: number;
  gas: number;
  sequence: number;
}

// Utility: clamp
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
// Utility: noise
const noise = (amplitude: number) => (Math.random() * 2 - 1) * amplitude;
// Utility: working-hour people count (sine-based)
const workingHourPeople = (maxPeople: number): number => {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  if (hour < 7 || hour > 20) return Math.max(0, Math.floor(noise(2)));
  const angle = ((hour - 7) / 13) * Math.PI;
  const base = Math.sin(angle) * maxPeople;
  // Lunch dip at ~12:30
  const lunchDip = hour > 12 && hour < 13.5 ? 0.6 : 1;
  return Math.max(0, Math.round(base * lunchDip + noise(3)));
};

function createMachine(id: string, name: string, rpm: number, current: number, power: number): MachineSimState {
  return {
    id, name,
    state: MachineState.RUNNING,
    rpm, temperature: 30 + Math.random() * 10,
    vibration: 1 + Math.random(),
    current, power,
    runtimeSeconds: 0, idleSeconds: 0,
    stateTimer: 0, faultCooldown: 0,
    nominalRpm: rpm, nominalCurrent: current, nominalPower: power
  };
}

// ─── Factory Setup ───────────────────────────────────────────────────────────
const deviceStates: DeviceSimState[] = [
  {
    deviceId: 'plc-001',
    machines: [
      createMachine('machine-001', 'Conveyor-01', 1200, 8.5, 1.8),
      createMachine('machine-002', 'Machine-01', 1480, 12.0, 2.7)
    ],
    actuators: [
      { actuatorId: 'relay-1', deviceId: 'plc-001', type: 'relay', state: 'ON' },
      { actuatorId: 'motor-1', deviceId: 'plc-001', type: 'motor', state: 'ON' },
      { actuatorId: 'fan-1',   deviceId: 'plc-001', type: 'fan',   state: 'OFF' }
    ],
    energyAccumulator: 0, peopleCount: 15,
    envTemperature: 23, envHumidity: 55,
    smoke: 0, gas: 0, sequence: 0
  },
  {
    deviceId: 'plc-002',
    machines: [
      createMachine('machine-003', 'Machine-02', 960, 10.0, 2.2),
      createMachine('machine-004', 'Machine-03', 1500, 15.0, 3.4)
    ],
    actuators: [
      { actuatorId: 'relay-2', deviceId: 'plc-002', type: 'relay', state: 'ON' },
      { actuatorId: 'motor-2', deviceId: 'plc-002', type: 'motor', state: 'ON' },
      { actuatorId: 'fan-2',   deviceId: 'plc-002', type: 'fan',   state: 'ON'  }
    ],
    energyAccumulator: 0, peopleCount: 8,
    envTemperature: 25, envHumidity: 60,
    smoke: 0, gas: 0, sequence: 0
  },
  {
    deviceId: 'plc-003',
    machines: [
      createMachine('machine-005', 'Assembly-01', 720, 6.0, 1.3)
    ],
    actuators: [
      { actuatorId: 'relay-3', deviceId: 'plc-003', type: 'relay', state: 'OFF' },
      { actuatorId: 'light-3', deviceId: 'plc-003', type: 'light', state: 'ON'  }
    ],
    energyAccumulator: 0, peopleCount: 5,
    envTemperature: 22, envHumidity: 50,
    smoke: 0, gas: 0, sequence: 0
  }
];

// ─── Simulator Control State ─────────────────────────────────────────────────
let isRunning = false;
let isPaused = false;
let currentScenario = 'NORMAL';
let publishIntervalMs = 5000;
let publishTimer: NodeJS.Timeout | null = null;
let messagesTotal = 0;
let messagesThisSecond = 0;
let messageRateDisplay = 0;
let lastPayload: any = null;
let mqttConnected = false;

// ─── MQTT Client ──────────────────────────────────────────────────────────────
let mqttClient: MqttClient | null = null;

function connectMqtt() {
  if (mqttClient) {
    try { mqttClient.end(true); } catch {}
  }
  mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USER,
    password: MQTT_PASSWORD,
    clientId: `sim_${Date.now().toString(16)}`,
    reconnectPeriod: 5000
  });

  mqttClient.on('connect', () => {
    mqttConnected = true;
    console.log('[SIMULATOR] Connected to MQTT');
    deviceStates.forEach(ds => {
      mqttClient!.subscribe(getCommandTopic(ds.deviceId));
      mqttClient!.publish(getStatusTopic(ds.deviceId), JSON.stringify({
        deviceId: ds.deviceId, status: 'ONLINE', timestamp: new Date().toISOString()
      }), { retain: true });
    });
  });

  mqttClient.on('disconnect', () => { mqttConnected = false; });
  mqttClient.on('offline', () => { mqttConnected = false; });
  mqttClient.on('error', (e) => { console.error('[SIMULATOR] MQTT error:', e.message); });

  mqttClient.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const parts = topic.split('/');
      const deviceId = parts[1];
      const ds = deviceStates.find(d => d.deviceId === deviceId);
      if (!ds || !payload.actuatorId || !payload.command) return;

      const act = ds.actuators.find(a => a.actuatorId === payload.actuatorId);
      if (!act) {
        // Unknown actuator — NACK
        mqttClient!.publish(getActuatorTopic(deviceId, payload.actuatorId), JSON.stringify({
          actuatorId: payload.actuatorId, deviceId, state: 'UNKNOWN',
          commandId: payload.commandId, status: 'NACK', timestamp: new Date().toISOString()
        }));
        return;
      }

      // Apply command
      switch (payload.command) {
        case 'ON':    act.state = 'ON'; break;
        case 'OFF':   act.state = 'OFF'; break;
        case 'TOGGLE': act.state = act.state === 'ON' ? 'OFF' : 'ON'; break;
        case 'RESET': act.state = 'OFF'; break;
        default: break;
      }

      // ACK
      mqttClient!.publish(getActuatorTopic(deviceId, act.actuatorId), JSON.stringify({
        actuatorId: act.actuatorId, deviceId, state: act.state,
        commandId: payload.commandId, status: 'ACK', timestamp: new Date().toISOString()
      }));

      console.log(`[SIMULATOR] Command ${payload.command} on ${act.actuatorId} → state=${act.state}`);
    } catch (e: any) {
      console.error('[SIMULATOR] Command error:', e.message);
    }
  });
}

connectMqtt();

// ─── Machine State Tick ───────────────────────────────────────────────────────
function tickMachine(m: MachineSimState, scenario: string, dtSeconds: number) {
  m.stateTimer += dtSeconds;
  if (m.faultCooldown > 0) m.faultCooldown -= dtSeconds;

  // Scenario overrides
  if (scenario === 'MACHINE_FAULT' && m.state !== MachineState.FAULT && m.faultCooldown <= 0) {
    if (Math.random() < 0.02) m.state = MachineState.FAULT;
  }
  if (scenario === 'MACHINE_OVERLOAD' && m.state === MachineState.RUNNING) {
    m.current = m.nominalCurrent * 1.8 + noise(0.5);
    m.power = m.nominalPower * 1.8 + noise(0.1);
    m.temperature = clamp(m.temperature + 0.5, 30, 85);
  }
  if (scenario === 'HIGH_VIBRATION') {
    m.vibration = 6 + noise(1);
  }

  // State transitions
  switch (m.state) {
    case MachineState.OFF:
      m.rpm = 0; m.current = 0; m.power = 0;
      m.temperature = clamp(m.temperature - 0.1, 20, 200);
      m.vibration = 0;
      if (scenario === 'MACHINE_STARTUP' && m.stateTimer > 3) {
        m.state = MachineState.STARTING; m.stateTimer = 0;
      }
      break;

    case MachineState.STARTING:
      m.rpm = clamp(m.rpm + m.nominalRpm * 0.1 * dtSeconds, 0, m.nominalRpm);
      m.current = m.nominalCurrent * 0.6 + noise(0.3);
      m.power = m.nominalPower * 0.5;
      m.temperature = clamp(m.temperature + 0.2, 20, 200);
      m.vibration = 0.5 + noise(0.3);
      if (m.rpm >= m.nominalRpm * 0.95) {
        m.state = MachineState.RUNNING; m.stateTimer = 0;
      }
      break;

    case MachineState.RUNNING:
      m.runtimeSeconds += dtSeconds;
      m.rpm = m.nominalRpm + noise(m.nominalRpm * 0.02);
      if (scenario !== 'MACHINE_OVERLOAD') {
        m.current = m.nominalCurrent + noise(m.nominalCurrent * 0.05);
        m.power = m.nominalPower + noise(m.nominalPower * 0.05);
      }
      m.temperature = clamp(m.temperature + noise(0.2), 30, 75);
      m.vibration = clamp(1.5 + noise(0.5), 0, 10);

      if (scenario === 'MACHINE_SHUTDOWN' && m.stateTimer > 5) {
        m.state = MachineState.IDLE; m.stateTimer = 0;
      }
      break;

    case MachineState.IDLE:
      m.idleSeconds += dtSeconds;
      m.rpm = clamp(m.rpm - 20 * dtSeconds, 0, m.nominalRpm);
      m.current = clamp(m.current - 0.5 * dtSeconds, 0, m.nominalCurrent);
      m.power = clamp(m.power - 0.1 * dtSeconds, 0, m.nominalPower);
      m.temperature = clamp(m.temperature - 0.1, 20, 200);
      m.vibration = clamp(m.vibration * 0.9, 0, 10);
      if (m.stateTimer > 30 && scenario !== 'MACHINE_SHUTDOWN') {
        m.state = MachineState.RUNNING; m.stateTimer = 0;
      }
      break;

    case MachineState.OVERLOADED:
      m.rpm = m.nominalRpm * 1.05 + noise(50);
      m.current = m.nominalCurrent * 2 + noise(1);
      m.power = m.nominalPower * 2;
      m.temperature = clamp(m.temperature + 1, 30, 100);
      m.vibration = 4 + noise(1);
      if (m.temperature > 80 || m.current > m.nominalCurrent * 2.5) {
        m.state = MachineState.FAULT; m.stateTimer = 0;
      }
      break;

    case MachineState.FAULT:
      m.rpm = clamp(m.rpm - 100 * dtSeconds, 0, m.nominalRpm);
      m.current = 0; m.power = 0;
      m.vibration = 6 + noise(2);
      m.temperature = clamp(m.temperature + 0.3, 30, 200);
      if (m.stateTimer > 60) {
        m.state = MachineState.MAINTENANCE;
        m.stateTimer = 0;
        m.faultCooldown = 120;
      }
      break;

    case MachineState.MAINTENANCE:
      m.rpm = 0; m.current = 0; m.power = 0;
      m.vibration = 0;
      m.temperature = clamp(m.temperature - 0.5, 20, 200);
      if (m.stateTimer > 30 && m.faultCooldown <= 0) {
        m.state = MachineState.RUNNING; m.stateTimer = 0;
      }
      break;
  }
}

// ─── Telemetry Generator ──────────────────────────────────────────────────────
let lastTickTime = Date.now();

function generateAndPublish() {
  if (!mqttClient || !mqttConnected) return;
  const now = Date.now();
  const dtSeconds = (now - lastTickTime) / 1000;
  lastTickTime = now;

  deviceStates.forEach(ds => {
    // Tick machines
    ds.machines.forEach(m => tickMachine(m, currentScenario, dtSeconds));

    // Environment drift
    if (currentScenario === 'HIGH_TEMPERATURE') {
      ds.envTemperature = clamp(ds.envTemperature + 0.3, 20, 60);
    } else {
      ds.envTemperature = clamp(ds.envTemperature + noise(0.15), 18, 45);
    }
    ds.envHumidity = clamp(ds.envHumidity + noise(0.2), 30, 80);
    ds.smoke = currentScenario === 'MACHINE_FAULT' ? noise(2) + 2 : Math.max(0, noise(0.1));
    ds.gas = Math.max(0, noise(0.05));

    // Electrical (aggregate of all machines + baseline load)
    const totalMachinePower = ds.machines.reduce((sum, m) => sum + m.power, 0);
    const baselinePower = 0.5; // kW baseline (lights, etc.)
    let totalPowerKw = totalMachinePower + baselinePower;

    if (currentScenario === 'POWER_SPIKE') {
      totalPowerKw = totalPowerKw * 2.5 + noise(1);
    }

    const voltage = 230 + noise(3);
    const powerFactor = clamp(0.92 + noise(0.03), 0.80, 1.0);
    const totalCurrent = totalPowerKw > 0 ? (totalPowerKw * 1000) / (voltage * powerFactor) : 0;
    const elapsedHours = dtSeconds / 3600;
    ds.energyAccumulator += totalPowerKw * elapsedHours;

    if (currentScenario === 'HIGH_CURRENT') {
      // Simulate high current draw
    }

    // People count
    ds.peopleCount = workingHourPeople(currentScenario === 'HIGH_OCCUPANCY' ? 60 : 30);

    ds.sequence++;

    const payload = {
      deviceId: ds.deviceId,
      timestamp: new Date().toISOString(),
      sequence: ds.sequence,
      source: 'simulator',
      electrical: {
        voltage: Math.round(voltage * 10) / 10,
        current: Math.round(totalCurrent * 100) / 100,
        power: Math.round(totalPowerKw * 1000) / 1000,
        powerFactor: Math.round(powerFactor * 1000) / 1000,
        energy: Math.round(ds.energyAccumulator * 1000) / 1000
      },
      environment: {
        temperature: Math.round(ds.envTemperature * 10) / 10,
        humidity: Math.round(ds.envHumidity * 10) / 10,
        smoke: Math.round(ds.smoke * 100) / 100,
        gas: Math.round(ds.gas * 100) / 100
      },
      people: { count: ds.peopleCount },
      machines: ds.machines.map(m => ({
        id: m.id,
        state: m.state,
        rpm: Math.round(m.rpm),
        temperature: Math.round(m.temperature * 10) / 10,
        vibration: Math.round(m.vibration * 100) / 100,
        current: Math.round(m.current * 100) / 100,
        power: Math.round(m.power * 1000) / 1000,
        runtimeSeconds: Math.round(m.runtimeSeconds)
      }))
    };

    lastPayload = payload;
    if (mqttClient && mqttConnected) {
      mqttClient.publish(getTelemetryTopic(ds.deviceId), JSON.stringify(payload));
      messagesTotal++;
      messagesThisSecond++;
    }
  });
}

export function startSimulation() {
  if (!isRunning) {
    isRunning = true;
    isPaused = false;
    lastTickTime = Date.now();
    publishTimer = setInterval(() => {
      if (!isPaused) generateAndPublish();
    }, publishIntervalMs);
    console.log('[SIMULATOR] Simulation loop active');
  }
}

// Message rate counter
setInterval(() => {
  messageRateDisplay = messagesThisSecond / (publishIntervalMs / 1000);
  messagesThisSecond = 0;
}, publishIntervalMs);

// ─── Simulator REST API ───────────────────────────────────────────────────────
app.get('/sim/status', (req, res) => {
  res.json({
    isRunning, isPaused, currentScenario,
    publishIntervalMs,
    mqttConnected,
    messageRatePerSec: messageRateDisplay,
    totalMessages: messagesTotal,
    devices: deviceStates.map(ds => ({
      deviceId: ds.deviceId,
      machines: ds.machines.map(m => ({
        id: m.id, name: m.name, state: m.state,
        rpm: Math.round(m.rpm), temperature: m.temperature,
        vibration: m.vibration
      })),
      peopleCount: ds.peopleCount,
      envTemperature: ds.envTemperature
    }))
  });
});

app.get('/sim/telemetry/latest', (req, res) => {
  res.json(lastPayload);
});

app.post('/sim/start', (req, res) => {
  if (!mqttClient || !mqttConnected) {
    connectMqtt();
  }
  startSimulation();
  res.json({ status: 'started', publishIntervalMs });
});

app.post('/sim/stop', (req, res) => {
  isRunning = false;
  isPaused = false;
  if (publishTimer) { clearInterval(publishTimer); publishTimer = null; }
  deviceStates.forEach(ds => {
    if (mqttClient && mqttConnected) {
      mqttClient.publish(getStatusTopic(ds.deviceId), JSON.stringify({
        deviceId: ds.deviceId, status: 'OFFLINE', timestamp: new Date().toISOString()
      }), { retain: true });
    }
  });
  console.log('[SIMULATOR] Stopped');
  res.json({ status: 'stopped' });
});

app.post('/sim/pause', (req, res) => {
  isPaused = true;
  res.json({ status: 'paused' });
});

app.post('/sim/resume', (req, res) => {
  isPaused = false;
  lastTickTime = Date.now();
  res.json({ status: 'resumed' });
});

app.post('/sim/scenario', (req, res) => {
  const valid = [
    'NORMAL', 'MACHINE_STARTUP', 'MACHINE_SHUTDOWN', 'POWER_SPIKE',
    'MACHINE_OVERLOAD', 'MACHINE_FAULT', 'HIGH_TEMPERATURE', 'HIGH_OCCUPANCY',
    'SENSOR_FAILURE', 'MQTT_DISCONNECT', 'HIGH_VIBRATION', 'HIGH_CURRENT'
  ];
  const scenario = req.body.scenario || 'NORMAL';
  if (!valid.includes(scenario)) {
    return res.status(400).json({ error: 'Invalid scenario', valid });
  }

  if (scenario === 'MQTT_DISCONNECT' && mqttClient) {
    mqttClient.end(true, {}, () => { mqttConnected = false; });
    currentScenario = 'NORMAL';
    return res.json({ scenario: 'MQTT_DISCONNECT', status: 'disconnected' });
  }

  currentScenario = scenario;

  // Trigger immediate machine state changes for some scenarios
  if (scenario === 'MACHINE_FAULT') {
    deviceStates[0].machines[0].state = MachineState.FAULT;
    deviceStates[0].machines[0].stateTimer = 0;
  }
  if (scenario === 'MACHINE_OVERLOAD') {
    deviceStates[0].machines[1].state = MachineState.OVERLOADED;
    deviceStates[0].machines[1].stateTimer = 0;
  }
  if (scenario === 'MACHINE_STARTUP') {
    deviceStates.forEach(ds => ds.machines.forEach(m => {
      m.state = MachineState.OFF; m.rpm = 0; m.stateTimer = 0;
    }));
  }
  if (scenario === 'MACHINE_SHUTDOWN') {
    deviceStates.forEach(ds => ds.machines.forEach(m => {
      if (m.state === MachineState.RUNNING) {
        m.state = MachineState.IDLE; m.stateTimer = 0;
      }
    }));
  }

  console.log(`[SIMULATOR] Scenario set to: ${scenario}`);
  res.json({ scenario: currentScenario });
});

app.post('/sim/interval', (req, res) => {
  const ms = parseInt(req.body.intervalMs) || 5000;
  publishIntervalMs = clamp(ms, 500, 60000);
  if (publishTimer) {
    clearInterval(publishTimer);
    publishTimer = setInterval(() => {
      if (!isPaused) generateAndPublish();
    }, publishIntervalMs);
  }
  res.json({ intervalMs: publishIntervalMs });
});

app.post('/sim/mqtt/disconnect', (req, res) => {
  if (mqttClient) {
    mqttClient.end(true, {}, () => { mqttConnected = false; });
  }
  res.json({ status: 'disconnected' });
});

app.post('/sim/mqtt/reconnect', (req, res) => {
  connectMqtt();
  res.json({ status: 'reconnecting' });
});

// Reset a specific machine state
app.post('/sim/machines/:machineId/reset', (req, res) => {
  const { machineId } = req.params;
  for (const ds of deviceStates) {
    const m = ds.machines.find(m => m.id === machineId);
    if (m) {
      m.state = MachineState.RUNNING;
      m.stateTimer = 0;
      m.faultCooldown = 0;
      return res.json({ machineId, state: 'RUNNING' });
    }
  }
  res.status(404).json({ error: 'Machine not found' });
});

app.listen(PORT, () => {
  console.log(`[SIMULATOR] Listening on port ${PORT}`);
  console.log(`[SIMULATOR] MQTT target: mqtt://${MQTT_HOST}:${MQTT_PORT}`);
  if (process.env.AUTO_START !== 'false') {
    startSimulation();
  }
});
