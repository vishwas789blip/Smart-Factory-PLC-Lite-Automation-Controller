import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}
import { User } from '../apps/api/src/models/User';
import { Factory } from '../apps/api/src/models/Factory';
import { Device } from '../apps/api/src/models/Device';
import { Sensor } from '../apps/api/src/models/Sensor';
import { Actuator } from '../apps/api/src/models/Actuator';
import { Telemetry } from '../apps/api/src/models/Telemetry';
import { Automation } from '../apps/api/src/models/Automation';
import { Schedule } from '../apps/api/src/models/Schedule';
import { Alert } from '../apps/api/src/models/Alert';
import { UserRole, DeviceType, AutomationTriggerType, MachineState, AlertSeverity, AlertType } from '@smart-factory/shared-types';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-factory';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  // Clear existing
  await Promise.all([
    User.deleteMany({}), Factory.deleteMany({}), Device.deleteMany({}),
    Sensor.deleteMany({}), Actuator.deleteMany({}), Telemetry.deleteMany({}),
    Automation.deleteMany({}), Schedule.deleteMany({}), Alert.deleteMany({})
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
  console.log('Seeded 4 users');
  
  // Factory
  const factory = await Factory.create({ 
    name: 'Smart Factory Alpha', 
    location: 'Detroit, MI', 
    timezone: 'America/New_York',
    description: 'Main automated assembly and production plant'
  });
  const fId = factory._id;
  console.log('Seeded 1 factory');

  // Devices
  const devices = [
    { 
      deviceId: 'plc-001', factoryId: fId, type: DeviceType.PLC_LITE, status: 'ONLINE',
      firmware: 'v2.1.0',
      capabilities: {
        sensors: ['temperature', 'humidity', 'power', 'vibration', 'current', 'voltage'],
        actuators: ['relay', 'motor', 'fan']
      }
    },
    { 
      deviceId: 'plc-002', factoryId: fId, type: DeviceType.PLC_LITE, status: 'ONLINE',
      firmware: 'v2.1.0',
      capabilities: {
        sensors: ['temperature', 'humidity', 'power', 'vibration', 'current', 'voltage'],
        actuators: ['relay', 'motor', 'fan']
      }
    },
    { 
      deviceId: 'plc-003', factoryId: fId, type: DeviceType.PLC_LITE, status: 'ONLINE',
      firmware: 'v2.0.4',
      capabilities: {
        sensors: ['temperature', 'humidity', 'power', 'people_count', 'smoke', 'gas'],
        actuators: ['relay', 'light']
      }
    }
  ];
  await Device.insertMany(devices);
  console.log('Seeded 3 devices');

  // Sensors & Actuators
  for (let i = 1; i <= 3; i++) {
    const dId = `plc-00${i}`;
    await Sensor.insertMany([
      { sensorId: `temp-${i}`, deviceId: dId, factoryId: fId, type: 'temperature', unit: '°C' },
      { sensorId: `hum-${i}`, deviceId: dId, factoryId: fId, type: 'humidity', unit: '%' },
      { sensorId: `pow-${i}`, deviceId: dId, factoryId: fId, type: 'power', unit: 'kW' },
      { sensorId: `vib-${i}`, deviceId: dId, factoryId: fId, type: 'vibration', unit: 'mm/s' }
    ]);
    await Actuator.insertMany([
      { actuatorId: `relay-${i}`, deviceId: dId, factoryId: fId, type: 'relay', state: i === 3 ? 'OFF' : 'ON' },
      { actuatorId: `motor-${i}`, deviceId: dId, factoryId: fId, type: 'motor', state: 'ON' },
      { actuatorId: `fan-${i}`, deviceId: dId, factoryId: fId, type: 'fan', state: i === 2 ? 'ON' : 'OFF' }
    ]);
  }
  console.log('Seeded sensors and actuators');

  // Telemetry (24 hours * 12 points per hour = 288 points per device)
  const telemetries = [];
  const now = new Date();
  
  const machinesByDevice: Record<string, any[]> = {
    'plc-001': [
      { id: 'machine-001', name: 'Conveyor-01', rpm: 1200, nominalCurrent: 8.5, nominalPower: 1.8 },
      { id: 'machine-002', name: 'Machine-01', rpm: 1480, nominalCurrent: 12.0, nominalPower: 2.7 }
    ],
    'plc-002': [
      { id: 'machine-003', name: 'Machine-02', rpm: 960, nominalCurrent: 10.0, nominalPower: 2.2 },
      { id: 'machine-004', name: 'Machine-03', rpm: 1500, nominalCurrent: 15.0, nominalPower: 3.4 }
    ],
    'plc-003': [
      { id: 'machine-005', name: 'Assembly-01', rpm: 720, nominalCurrent: 6.0, nominalPower: 1.3 }
    ]
  };

  for (let d = 1; d <= 3; d++) {
    const dId = `plc-00${d}`;
    const devMachines = machinesByDevice[dId] || [];
    let accEnergy = 0;

    for (let i = 0; i < 288; i++) {
      const ts = new Date(now.getTime() - (288 - i) * 5 * 60000);
      const hour = ts.getHours() + ts.getMinutes() / 60;
      
      // Working hour occupancy
      const isShift = hour >= 8 && hour <= 18;
      const basePower = isShift ? 4.5 : 1.2;
      const power = basePower + Math.sin(hour / 3) * 0.8 + (Math.random() * 0.4 - 0.2);
      const voltage = 230 + (Math.random() * 4 - 2);
      const pf = 0.92 + Math.random() * 0.05;
      const current = (power * 1000) / (voltage * pf);
      accEnergy += power * (5 / 60);

      // Machines simulation for telemetry
      const machinesData = devMachines.map(m => {
        const isRunning = isShift || Math.random() > 0.4;
        const state = isRunning ? MachineState.RUNNING : MachineState.IDLE;
        return {
          id: m.id,
          state,
          rpm: isRunning ? m.rpm + Math.round(Math.random() * 20 - 10) : 0,
          temperature: isRunning ? 42 + Math.random() * 6 : 24 + Math.random() * 2,
          vibration: isRunning ? 1.5 + Math.random() * 0.8 : 0.1,
          current: isRunning ? m.nominalCurrent + (Math.random() * 0.5 - 0.25) : 0.2,
          power: isRunning ? m.nominalPower + (Math.random() * 0.1 - 0.05) : 0.05,
          runtimeSeconds: isRunning ? (i * 300) : Math.round(i * 150)
        };
      });

      telemetries.push({
        deviceId: dId,
        timestamp: ts,
        sequence: i,
        source: 'seed',
        electrical: {
          voltage: Math.round(voltage * 10) / 10,
          current: Math.round(current * 100) / 100,
          power: Math.max(0.1, Math.round(power * 1000) / 1000),
          powerFactor: Math.round(pf * 1000) / 1000,
          energy: Math.round(accEnergy * 1000) / 1000
        },
        environment: {
          temperature: Math.round((22 + (isShift ? 3 : 0) + Math.random()) * 10) / 10,
          humidity: Math.round((48 + Math.random() * 5) * 10) / 10,
          smoke: 0,
          gas: 0
        },
        people: {
          count: isShift ? Math.floor(15 + Math.sin((hour - 8) / 10 * Math.PI) * 20) : Math.floor(Math.random() * 3)
        },
        machines: machinesData
      });
    }
  }
  await Telemetry.insertMany(telemetries);
  console.log(`Seeded ${telemetries.length} telemetry records with machine analytics`);

  // Seed default Automations
  await Automation.create([
    {
      name: 'High Temperature Fan Automation',
      factoryId: fId,
      enabled: true,
      triggerType: AutomationTriggerType.TELEMETRY,
      conditions: {
        type: 'LEAF',
        metric: 'environment.temperature',
        operator: '>',
        value: 35
      },
      actions: [
        { actuatorId: 'fan-1', command: 'ON', deviceId: 'plc-001' }
      ],
      cooldownSeconds: 60,
      maxExecutionsPerHour: 10,
      description: 'Automatically turns on ventilation fan if zone temperature exceeds 35°C'
    },
    {
      name: 'Power Spike Load Shedding',
      factoryId: fId,
      enabled: true,
      triggerType: AutomationTriggerType.TELEMETRY,
      conditions: {
        type: 'LEAF',
        metric: 'electrical.power',
        operator: '>',
        value: 8.0
      },
      actions: [
        { actuatorId: 'relay-3', command: 'OFF', deviceId: 'plc-003' }
      ],
      cooldownSeconds: 120,
      maxExecutionsPerHour: 5,
      description: 'Sheds non-critical relay load when electrical demand exceeds 8 kW'
    }
  ]);
  console.log('Seeded 2 default automations');

  // Seed default Schedules
  await Schedule.create([
    {
      name: 'Shift Start Equipment Activation',
      factoryId: fId,
      enabled: true,
      cronExpression: '0 8 * * 1-5',
      timezone: 'America/New_York',
      actions: [
        { actuatorId: 'relay-1', command: 'ON', deviceId: 'plc-001' },
        { actuatorId: 'motor-1', command: 'ON', deviceId: 'plc-001' }
      ],
      description: 'Starts production line conveyor at 08:00 on weekdays'
    },
    {
      name: 'Eco Night Standby',
      factoryId: fId,
      enabled: true,
      cronExpression: '0 19 * * *',
      timezone: 'America/New_York',
      actions: [
        { actuatorId: 'fan-1', command: 'OFF', deviceId: 'plc-001' },
        { actuatorId: 'fan-2', command: 'OFF', deviceId: 'plc-002' }
      ],
      description: 'Turns off auxiliary ventilation fans at 19:00 for energy saving'
    }
  ]);
  console.log('Seeded 2 default schedules');

  // Seed sample alerts
  await Alert.create([
    {
      severity: AlertSeverity.MEDIUM,
      type: AlertType.HIGH_TEMPERATURE,
      message: 'Zone temperature reached 36.2°C (threshold: 35°C)',
      deviceId: 'plc-001',
      timestamp: new Date(now.getTime() - 15 * 60000),
      acknowledged: false
    },
    {
      severity: AlertSeverity.LOW,
      type: AlertType.HIGH_POWER,
      message: 'Peak power reached 8.4 kW during shift start',
      deviceId: 'plc-002',
      timestamp: new Date(now.getTime() - 45 * 60000),
      acknowledged: true
    }
  ]);
  console.log('Seeded sample alerts');

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
