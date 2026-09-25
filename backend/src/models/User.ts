import { Schema, model, Document, Types } from 'mongoose';

export type UserRole =
  | 'admin'
  | 'expedition_coordinator'
  | 'logistics_officer'
  | 'inventory_manager'
  | 'personnel_coordinator'
  | 'emergency_coordinator'
  | 'station_ops';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  station?: Types.ObjectId;
  isActive: boolean;
  refreshTokenVersion: number; // incremented on logout to invalidate old refresh tokens
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [
        'admin',
        'expedition_coordinator',
        'logistics_officer',
        'inventory_manager',
        'personnel_coordinator',
        'emergency_coordinator',
        'station_ops',
      ],
      required: true,
    },
    station: { type: Schema.Types.ObjectId, ref: 'Station' },
    isActive: { type: Boolean, default: true },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
