import os

seed_ts = """import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../apps/api/src/models/User';
import { Factory } from '../apps/api/src/models/Factory';
import { Device } from '../apps/api/src/models/Device';
import { Sensor } from '../apps/api/src/models/Sensor';
import { Actuator } from '../apps/api/src/models/Actuator';
import { Telemetry } from '../apps/api/src/models/Telemetry';
import { Automation } from '../apps/api/src/models/Automation';
import { Schedule } from '../apps/api/src/models/Schedule';
import { UserRole, DeviceType, AutomationTriggerType } from '@smart-factory/shared-types';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-factory';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  // Clear existing
  await Promise.all([
    User.deleteMany({}), Factory.deleteMany({}), Device.deleteMany({}),
    Sensor.deleteMany({}), Actuator.deleteMany({}), Telemetry.deleteMany({}),
    Automation.deleteMany({}), Schedule.deleteMany({})
  ]);

  const salt = await bcrypt.genSalt(10);
  
  // Users
  const users = [
    { email: 'admin@factory.local', password: await bcrypt.hash('Admin@1234', salt), role: UserRole.ADMIN },
    { email: 'engineer@factory.local', password: await bcrypt.hash('Engineer@1234', salt), role: UserRole.ENGINEER },
    { email: 'operator@factory.local', password: await bcrypt.hash('Operator@1234', salt), role: UserRole.OPERATOR },
    { email: 'viewer@factory.local', password: await bcrypt.hash('Viewer@1234', salt), role: UserRole.VIEWER }
  ];
  await User.insertMany(users);
  
  // Factory
  const factory = await Factory.create({ name: 'Smart Factory Alpha', location: 'New York', timezone: 'UTC' });
  const fId = factory._id;

  // Devices
  const devices = [
    { deviceId: 'plc-001', factoryId: fId, type: DeviceType.PLC_LITE, status: 'ONLINE' },
    { deviceId: 'plc-002', factoryId: fId, type: DeviceType.PLC_LITE, status: 'ONLINE' },
    { deviceId: 'plc-003', factoryId: fId, type: DeviceType.PLC_LITE, status: 'ONLINE' }
  ];
  await Device.insertMany(devices);

  // Sensors & Actuators
  for (let i = 1; i <= 3; i++) {
    const dId = `plc-00${i}`;
    await Sensor.insertMany([
      { sensorId: `temp-${i}`, deviceId: dId, factoryId: fId, type: 'temperature', unit: 'C' },
      { sensorId: `hum-${i}`, deviceId: dId, factoryId: fId, type: 'humidity', unit: '%' },
      { sensorId: `pow-${i}`, deviceId: dId, factoryId: fId, type: 'power', unit: 'kW' },
      { sensorId: `vib-${i}`, deviceId: dId, factoryId: fId, type: 'vibration', unit: 'mm/s' }
    ]);
    await Actuator.insertMany([
      { actuatorId: `relay-${i}`, deviceId: dId, factoryId: fId, type: 'relay', state: 'OFF' },
      { actuatorId: `motor-${i}`, deviceId: dId, factoryId: fId, type: 'motor', state: 'OFF' },
      { actuatorId: `fan-${i}`, deviceId: dId, factoryId: fId, type: 'fan', state: 'OFF' }
    ]);
  }

  // Telemetry (24 hours * 12 per hour = 288 per device)
  const telemetries = [];
  const now = new Date();
  for (let d = 1; d <= 3; d++) {
    for (let i = 0; i < 288; i++) {
      const ts = new Date(now.getTime() - (288 - i) * 5 * 60000);
      telemetries.push({
        deviceId: `plc-00${d}`,
        timestamp: ts,
        sequence: i,
        source: 'seed',
        electrical: { voltage: 230, current: 10, power: 2.3, powerFactor: 0.95, energy: i * 0.5 },
        environment: { temperature: 22 + Math.random(), humidity: 45 + Math.random(), smoke: 0, gas: 0 },
        people: { count: Math.floor(Math.random() * 50) },
        machines: []
      });
    }
  }
  await Telemetry.insertMany(telemetries);

  console.log('Seed complete');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
"""

with open(r"C:\Users\vishw\.gemini\antigravity\scratch\smart-factory\scripts\seed.ts", "w") as f:
    f.write(seed_ts)

print("Created seed.ts")
