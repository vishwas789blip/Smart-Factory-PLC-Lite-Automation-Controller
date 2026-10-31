import { Schema, model } from 'mongoose';
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
