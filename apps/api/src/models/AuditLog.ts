import { Schema, model } from 'mongoose';
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
