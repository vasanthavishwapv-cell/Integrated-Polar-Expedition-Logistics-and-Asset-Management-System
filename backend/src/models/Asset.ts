import { Schema, model, Document, Types } from 'mongoose';

export type AssetStatus =
  | 'operational'
  | 'under_maintenance'
  | 'fault_reported'
  | 'out_of_service'
  | 'retired';

export interface IAsset extends Document {
  _id: Types.ObjectId;
  assetId: string; // e.g. AST-2026-0001
  name: string;
  category: string;
  assignedStation?: Types.ObjectId;
  assignedExpedition?: Types.ObjectId;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  status: AssetStatus;
  acquisitionDate: Date;
  maintenanceIntervalDays: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDue?: Date;
  usageHours: number;
  usageHoursThreshold: number;
  serialNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    assetId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    assignedStation: { type: Schema.Types.ObjectId, ref: 'Station' },
    assignedExpedition: { type: Schema.Types.ObjectId, ref: 'Expedition' },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good',
    },
    status: {
      type: String,
      enum: ['operational', 'under_maintenance', 'fault_reported', 'out_of_service', 'retired'],
      default: 'operational',
    },
    acquisitionDate: { type: Date, required: true },
    maintenanceIntervalDays: { type: Number, required: true, min: 1 },
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDue: { type: Date },
    usageHours: { type: Number, default: 0, min: 0 },
    usageHoursThreshold: { type: Number, required: true },
    serialNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

assetSchema.index({ status: 1 });
assetSchema.index({ assignedStation: 1 });
assetSchema.index({ nextMaintenanceDue: 1 });

export const Asset = model<IAsset>('Asset', assetSchema);

// ── Maintenance Record ────────────────────────────────────────────────────

export interface IMaintenanceRecord extends Document {
  _id: Types.ObjectId;
  asset: Types.ObjectId;
  type: 'scheduled' | 'corrective' | 'fault_report';
  description: string;
  performedBy?: string; // free-text technician name
  maintenanceDate: Date;
  nextScheduledDate?: Date;
  cost?: number;
  notes?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
}

const maintenanceRecordSchema = new Schema<IMaintenanceRecord>(
  {
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    type: {
      type: String,
      enum: ['scheduled', 'corrective', 'fault_report'],
      required: true,
    },
    description: { type: String, required: true },
    performedBy: { type: String },
    maintenanceDate: { type: Date, required: true },
    nextScheduledDate: { type: Date },
    cost: { type: Number },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

maintenanceRecordSchema.index({ asset: 1, createdAt: -1 });

export const MaintenanceRecord = model<IMaintenanceRecord>(
  'MaintenanceRecord',
  maintenanceRecordSchema
);
