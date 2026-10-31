import { Schema, model } from 'mongoose';
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
