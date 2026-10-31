import { Schema, model } from 'mongoose';
import { UserRole } from '@smart-factory/shared-types';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.VIEWER },
  refreshTokens: [String]
}, { timestamps: true });

export const User = model('User', userSchema);
