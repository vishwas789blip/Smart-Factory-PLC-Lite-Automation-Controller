import { Schema, model } from 'mongoose';

const factorySchema = new Schema({
  name: { type: String, required: true },
  location: String,
  timezone: { type: String, default: 'UTC' },
  description: String
}, { timestamps: true });

export const Factory = model('Factory', factorySchema);
