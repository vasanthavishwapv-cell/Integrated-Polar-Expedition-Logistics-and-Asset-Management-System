import { Schema, model, Document, Types } from 'mongoose';

export type PersonnelStatus =
  | 'assigned'
  | 'preparing'
  | 'in_transit'
  | 'at_station'
  | 'on_assignment'
  | 'returned'
  | 'status_verification_required';

export interface IPersonnel extends Document {
  _id: Types.ObjectId;
  personnelId: string; // e.g. PRS-2026-0001
  name: string;
  role: string;
  department: string;
  email: string;
  linkedExpedition?: Types.ObjectId;
  assignedStation?: Types.ObjectId;
  currentStatus: PersonnelStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const personnelSchema = new Schema<IPersonnel>(
  {
    personnelId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true },
    department: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    linkedExpedition: { type: Schema.Types.ObjectId, ref: 'Expedition' },
    assignedStation: { type: Schema.Types.ObjectId, ref: 'Station' },
    currentStatus: {
      type: String,
      enum: [
        'assigned','preparing','in_transit','at_station',
        'on_assignment','returned','status_verification_required',
      ],
      default: 'assigned',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

personnelSchema.index({ currentStatus: 1 });
personnelSchema.index({ assignedStation: 1 });

export const Personnel = model<IPersonnel>('Personnel', personnelSchema);

// ── Personnel Movement ────────────────────────────────────────────────────

export type MovementEventType = 'check_in' | 'check_out' | 'status_update';

export interface IPersonnelMovement extends Document {
  _id: Types.ObjectId;
  personnel: Types.ObjectId;
  eventType: MovementEventType;
  fromStatus?: PersonnelStatus;
  toStatus: PersonnelStatus;
  location?: string; // self-reported, labeled as such
  notes?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
}

const personnelMovementSchema = new Schema<IPersonnelMovement>(
  {
    personnel: { type: Schema.Types.ObjectId, ref: 'Personnel', required: true },
    eventType: {
      type: String,
      enum: ['check_in', 'check_out', 'status_update'],
      required: true,
    },
    fromStatus: { type: String },
    toStatus: { type: String, required: true },
    location: { type: String },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

personnelMovementSchema.index({ personnel: 1, createdAt: -1 });

export const PersonnelMovement = model<IPersonnelMovement>(
  'PersonnelMovement',
  personnelMovementSchema
);
