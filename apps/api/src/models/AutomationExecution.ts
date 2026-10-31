import { Schema, model } from 'mongoose';

const automationExecutionSchema = new Schema({
  automationId: { type: Schema.Types.ObjectId, ref: 'Automation', required: true },
  triggeredAt: { type: Date, required: true },
  conditionSnapshot: Schema.Types.Mixed,
  actionsExecuted: [Schema.Types.Mixed],
  result: String,
  error: String
}, { timestamps: true });

export const AutomationExecution = model('AutomationExecution', automationExecutionSchema);
