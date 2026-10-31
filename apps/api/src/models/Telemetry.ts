import { Schema, model } from 'mongoose';

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
