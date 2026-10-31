import { Schema, model } from 'mongoose';

const actuatorSchema = new Schema({
  actuatorId: { type: String, required: true },
  deviceId: { type: String, required: true },
  factoryId: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
  type: { type: String, required: true },
  state: String,
  lastCommand: String,
  lastCommandId: String,
  lastCommandStatus: String
}, { timestamps: true });

actuatorSchema.index({ deviceId: 1, actuatorId: 1 }, { unique: true });

export const Actuator = model('Actuator', actuatorSchema);
