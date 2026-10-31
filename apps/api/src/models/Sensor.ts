import { Schema, model } from 'mongoose';

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
