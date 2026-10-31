import { Schema, model } from 'mongoose';
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
