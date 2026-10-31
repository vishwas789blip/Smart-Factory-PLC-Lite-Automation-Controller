import { describe, it, expect } from 'vitest';

interface AlertDoc {
  type: string;
  severity: string;
  deviceId: string;
  message: string;
  actuatorId?: string;
  machineId?: string;
  resolvedAt?: Date;
  timestamp: Date;
}

// Memory store replicating Mongoose query logic for checkAndCreateAlert
class MockAlertStore {
  alerts: AlertDoc[] = [];

  async findOne(query: {
    type: string;
    deviceId: string;
    resolvedAt?: { $exists: boolean };
    actuatorId?: string;
    machineId?: string;
  }): Promise<AlertDoc | null> {
    return this.alerts.find(a => {
      if (a.type !== query.type) return false;
      if (a.deviceId !== query.deviceId) return false;
      if (query.resolvedAt && query.resolvedAt.$exists === false && a.resolvedAt !== undefined) return false;
      if (query.actuatorId && a.actuatorId !== query.actuatorId) return false;
      if (query.machineId && a.machineId !== query.machineId) return false;
      return true;
    }) || null;
  }

  async create(doc: Omit<AlertDoc, 'timestamp'>): Promise<AlertDoc> {
    const alert: AlertDoc = { ...doc, timestamp: new Date() };
    this.alerts.push(alert);
    return alert;
  }
}

const checkAndCreateAlert = async (
  store: MockAlertStore,
  type: string,
  severity: string,
  deviceId: string,
  message: string,
  actuatorId?: string,
  machineId?: string
) => {
  const query: any = { type, deviceId, resolvedAt: { $exists: false } };
  if (actuatorId) query.actuatorId = actuatorId;
  if (machineId) query.machineId = machineId;
  const existing = await store.findOne(query);
  if (!existing) {
    return await store.create({ type, severity, deviceId, message, actuatorId, machineId });
  }
  return null;
};

describe('Alert Deduplication & Multi-Machine Isolation', () => {
  it('deduplicates identical alerts for the same machine on the same device', async () => {
    const store = new MockAlertStore();

    const alert1 = await checkAndCreateAlert(store, 'MACHINE_FAULT', 'CRITICAL', 'plc-001', 'Machine 1 faulted', undefined, 'machine-1');
    expect(alert1).not.toBeNull();
    expect(store.alerts.length).toBe(1);

    // Duplicate alert for machine-1 should be rejected
    const alert2 = await checkAndCreateAlert(store, 'MACHINE_FAULT', 'CRITICAL', 'plc-001', 'Machine 1 faulted again', undefined, 'machine-1');
    expect(alert2).toBeNull();
    expect(store.alerts.length).toBe(1);
  });

  it('allows separate alerts for multiple distinct machines on the same device', async () => {
    const store = new MockAlertStore();

    const alertM1 = await checkAndCreateAlert(store, 'MACHINE_FAULT', 'CRITICAL', 'plc-001', 'Machine 1 faulted', undefined, 'machine-1');
    const alertM2 = await checkAndCreateAlert(store, 'MACHINE_FAULT', 'CRITICAL', 'plc-001', 'Machine 2 faulted', undefined, 'machine-2');

    expect(alertM1).not.toBeNull();
    expect(alertM2).not.toBeNull();
    expect(store.alerts.length).toBe(2);
    expect(store.alerts[0].machineId).toBe('machine-1');
    expect(store.alerts[1].machineId).toBe('machine-2');
  });

  it('allows separate alerts for multiple distinct actuators timing out on the same device', async () => {
    const store = new MockAlertStore();

    const act1 = await checkAndCreateAlert(store, 'ACTUATOR_TIMEOUT', 'MEDIUM', 'plc-001', 'Actuator 1 timeout', 'fan-01');
    const act2 = await checkAndCreateAlert(store, 'ACTUATOR_TIMEOUT', 'MEDIUM', 'plc-001', 'Actuator 2 timeout', 'valve-02');

    expect(act1).not.toBeNull();
    expect(act2).not.toBeNull();
    expect(store.alerts.length).toBe(2);
    expect(store.alerts[0].actuatorId).toBe('fan-01');
    expect(store.alerts[1].actuatorId).toBe('valve-02');
  });

  it('allows re-triggering an alert after the previous alert is resolved', async () => {
    const store = new MockAlertStore();

    const alert1 = await checkAndCreateAlert(store, 'MACHINE_FAULT', 'CRITICAL', 'plc-001', 'Machine 1 faulted', undefined, 'machine-1');
    expect(alert1).not.toBeNull();

    // Resolve machine 1
    store.alerts[0].resolvedAt = new Date();

    // Now a new fault for machine 1 should be recorded
    const alert2 = await checkAndCreateAlert(store, 'MACHINE_FAULT', 'CRITICAL', 'plc-001', 'Machine 1 faulted again', undefined, 'machine-1');
    expect(alert2).not.toBeNull();
    expect(store.alerts.length).toBe(2);
  });
});

