import os

models_dir = r"C:\Users\vishw\.gemini\antigravity\scratch\smart-factory\apps\api\src\models"
os.makedirs(models_dir, exist_ok=True)

models = {
    "User.ts": """import { Schema, model } from 'mongoose';
import { UserRole } from '@smart-factory/shared-types';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.VIEWER },
  refreshTokens: [String]
}, { timestamps: true });

export const User = model('User', userSchema);
""",
    "Factory.ts": """import { Schema, model } from 'mongoose';

const factorySchema = new Schema({
  name: { type: String, required: true },
  location: String,
  timezone: { type: String, default: 'UTC' },
  description: String
}, { timestamps: true });

export const Factory = model('Factory', factorySchema);
""",
    "Device.ts": """import { Schema, model } from 'mongoose';
import { DeviceType } from '@smart-factory/shared-types';

const deviceSchema = new Schema({
  deviceId: { type: String, required: true, unique: true },
  factoryId: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
  type: { type: String, enum: Object.values(DeviceType), required: true },
  capabilities: {
    sensors: [String],
    actuators: [String]
  },
  status: { type: String, enum: ['ONLINE', 'OFFLINE'], default: 'OFFLINE' },
  lastSeen: Date,
  firmware: String
}, { timestamps: true });

deviceSchema.index({ factoryId: 1 });

export const Device = model('Device', deviceSchema);
""",
    "Sensor.ts": """import { Schema, model } from 'mongoose';

const sensorSchema = new Schema({
  sensorId: { type: String, required: true },
  deviceId: { type: String, required: true },
  factoryId: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
  type: { type: String, required: true },
  unit: String,
  min: Number,
  max: Number,
  currentValue: Number,
  lastUpdated: Date
}, { timestamps: true });

sensorSchema.index({ deviceId: 1, sensorId: 1 }, { unique: true });

export const Sensor = model('Sensor', sensorSchema);
""",
    "Actuator.ts": """import { Schema, model } from 'mongoose';

const actuatorSchema = new Schema({
  actuatorId: { type: String, required: true },
  deviceId: { type: String, required: true },
  factoryId: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
  type: { type: String, required: true },
  state: String,
  lastCommand: String,
  lastCommandId: String,
  lastCommandStatus: String
}, { timestamps: true });

actuatorSchema.index({ deviceId: 1, actuatorId: 1 }, { unique: true });

export const Actuator = model('Actuator', actuatorSchema);
""",
    "Telemetry.ts": """import { Schema, model } from 'mongoose';

const telemetrySchema = new Schema({
  deviceId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  sequence: Number,
  source: String,
  electrical: {
    voltage: Number,
    current: Number,
    power: Number,
    powerFactor: Number,
    energy: Number
  },
  environment: {
    temperature: Number,
    humidity: Number,
    smoke: Number,
    gas: Number
  },
  people: { count: Number },
  machines: [Schema.Types.Mixed]
}, { timestamps: true });

telemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
telemetrySchema.index({ deviceId: 1, timestamp: -1 });

export const Telemetry = model('Telemetry', telemetrySchema);
""",
    "Automation.ts": """import { Schema, model } from 'mongoose';
import { AutomationTriggerType } from '@smart-factory/shared-types';

const automationSchema = new Schema({
  name: { type: String, required: true },
  factoryId: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
  enabled: { type: Boolean, default: true },
  triggerType: { type: String, enum: Object.values(AutomationTriggerType), required: true },
  conditions: Schema.Types.Mixed,
  actions: [Schema.Types.Mixed],
  cooldownSeconds: { type: Number, default: 60 },
  debounceSeconds: { type: Number, default: 0 },
  maxExecutionsPerHour: { type: Number, default: 10 },
  lastExecutedAt: Date,
  description: String
}, { timestamps: true });

export const Automation = model('Automation', automationSchema);
""",
    "AutomationExecution.ts": """import { Schema, model } from 'mongoose';

const automationExecutionSchema = new Schema({
  automationId: { type: Schema.Types.ObjectId, ref: 'Automation', required: true },
  triggeredAt: { type: Date, required: true },
  conditionSnapshot: Schema.Types.Mixed,
  actionsExecuted: [Schema.Types.Mixed],
  result: String,
  error: String
}, { timestamps: true });

export const AutomationExecution = model('AutomationExecution', automationExecutionSchema);
""",
    "Schedule.ts": """import { Schema, model } from 'mongoose';

const scheduleSchema = new Schema({
  name: { type: String, required: true },
  factoryId: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
  enabled: { type: Boolean, default: true },
  cronExpression: { type: String, required: true },
  timezone: { type: String, default: 'UTC' },
  actions: [Schema.Types.Mixed],
  description: String
}, { timestamps: true });

export const Schedule = model('Schedule', scheduleSchema);
""",
    "Alert.ts": """import { Schema, model } from 'mongoose';
import { AlertSeverity, AlertType } from '@smart-factory/shared-types';

const alertSchema = new Schema({
  severity: { type: String, enum: Object.values(AlertSeverity), required: true },
  type: { type: String, enum: Object.values(AlertType), required: true },
  message: { type: String, required: true },
  deviceId: String,
  actuatorId: String,
  machineId: String,
  timestamp: { type: Date, required: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date
}, { timestamps: true });

alertSchema.index({ deviceId: 1, type: 1, resolvedAt: 1 });

export const Alert = model('Alert', alertSchema);
""",
    "AuditLog.ts": """import { Schema, model } from 'mongoose';
import { UserRole } from '@smart-factory/shared-types';

const auditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userEmail: String,
  role: { type: String, enum: Object.values(UserRole) },
  action: { type: String, required: true },
  resource: String,
  deviceId: String,
  actuatorId: String,
  timestamp: { type: Date, default: Date.now },
  result: String,
  ipAddress: String,
  userAgent: String
});

export const AuditLog = model('AuditLog', auditLogSchema);
""",
    "AIInsight.ts": """import { Schema, model } from 'mongoose';

const aiInsightSchema = new Schema({
  type: { type: String, enum: ['ANOMALY', 'PREDICTION', 'OPTIMIZATION'], required: true },
  deviceId: String,
  timestamp: { type: Date, default: Date.now },
  data: Schema.Types.Mixed,
  severity: String,
  acknowledged: { type: Boolean, default: false }
}, { timestamps: true });

export const AIInsight = model('AIInsight', aiInsightSchema);
"""
}

for filename, content in models.items():
    with open(os.path.join(models_dir, filename), "w") as f:
        f.write(content)

print("Generated models")
