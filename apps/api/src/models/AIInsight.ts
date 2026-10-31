import { Schema, model } from 'mongoose';

const aiInsightSchema = new Schema({
  type: { type: String, enum: ['ANOMALY', 'PREDICTION', 'OPTIMIZATION'], required: true },
  deviceId: String,
  timestamp: { type: Date, default: Date.now },
  data: Schema.Types.Mixed,
  severity: String,
  acknowledged: { type: Boolean, default: false }
}, { timestamps: true });

export const AIInsight = model('AIInsight', aiInsightSchema);
