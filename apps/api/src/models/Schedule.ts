import { Schema, model } from 'mongoose';

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
