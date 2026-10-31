export enum MachineState {
  OFF = 'OFF',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  OVERLOADED = 'OVERLOADED',
  FAULT = 'FAULT',
  MAINTENANCE = 'MAINTENANCE'
}

export enum ActuatorCommand {
  ON = 'ON',
  OFF = 'OFF',
  TOGGLE = 'TOGGLE',
  SET = 'SET',
  RESET = 'RESET'
}

export enum SensorType {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  CURRENT = 'current',
  VOLTAGE = 'voltage',
  POWER = 'power',
  ENERGY = 'energy',
  VIBRATION = 'vibration',
  PEOPLE_COUNT = 'people_count',
  SMOKE = 'smoke',
  GAS = 'gas'
}

export enum ActuatorType {
  RELAY = 'relay',
  MOTOR = 'motor',
  FAN = 'fan',
  LIGHT = 'light'
}

export enum DeviceType {
  PLC_LITE = 'PLC_LITE'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AlertType {
  HIGH_POWER = 'HIGH_POWER',
  HIGH_CURRENT = 'HIGH_CURRENT',
  HIGH_TEMPERATURE = 'HIGH_TEMPERATURE',
  HIGH_VIBRATION = 'HIGH_VIBRATION',
  MACHINE_FAULT = 'MACHINE_FAULT',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  MQTT_DISCONNECT = 'MQTT_DISCONNECT',
  AUTOMATION_FAILURE = 'AUTOMATION_FAILURE',
  AUTH_FAILURE = 'AUTH_FAILURE',
  ACTUATOR_TIMEOUT = 'ACTUATOR_TIMEOUT'
}

export enum UserRole {
  VIEWER = 'VIEWER',
  OPERATOR = 'OPERATOR',
  ENGINEER = 'ENGINEER',
  ADMIN = 'ADMIN'
}

export enum AutomationTriggerType {
  TELEMETRY = 'TELEMETRY',
  SCHEDULE = 'SCHEDULE',
  DEVICE_STATUS = 'DEVICE_STATUS',
  MANUAL = 'MANUAL'
}

export interface MachineData {
  id: string;
  state: MachineState;
  rpm: number;
  temperature: number;
  vibration: number;
  current: number;
  power: number;
  runtimeSeconds: number;
}

export interface TelemetryPayload {
  deviceId: string;
  timestamp: string;
  sequence: number;
  source: string;
  electrical: {
    voltage: number;
    current: number;
    power: number;
    powerFactor: number;
    energy: number;
  };
  environment: {
    temperature: number;
    humidity: number;
    smoke: number;
    gas: number;
  };
  people: {
    count: number;
  };
  machines: MachineData[];
}

export interface CommandPayload {
  commandId: string;
  deviceId: string;
  actuatorId: string;
  command: ActuatorCommand;
  value?: number;
  duration?: number;
  timestamp: string;
}

export interface DeviceCapabilities {
  deviceId: string;
  type: DeviceType;
  capabilities: {
    sensors: SensorType[];
    actuators: ActuatorType[];
  };
}

export interface ActuatorState {
  actuatorId: string;
  deviceId: string;
  state: string;
  command?: ActuatorCommand;
  timestamp: string;
}
