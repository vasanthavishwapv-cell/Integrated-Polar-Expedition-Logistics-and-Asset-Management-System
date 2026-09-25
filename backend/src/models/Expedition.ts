import { Schema, model, Document, Types } from 'mongoose';

export type ExpeditionStatus = 'draft' | 'planned' | 'active' | 'completed' | 'cancelled';
export type MissionType = 'scientific' | 'resupply' | 'maintenance' | 'emergency' | 'survey';

// Valid transitions: draft→planned, planned→active, active→completed
// Cancellable from: draft, planned only
const VALID_TRANSITIONS: Record<ExpeditionStatus, ExpeditionStatus[]> = {
  draft: ['planned', 'cancelled'],
  planned: ['active', 'cancelled'],
  active: ['completed'],
  completed: [],
  cancelled: [],
};

export const isValidExpeditionTransition = (from: ExpeditionStatus, to: ExpeditionStatus) =>
  VALID_TRANSITIONS[from]?.includes(to) ?? false;

export interface IExpedition extends Document {
  _id: Types.ObjectId;
  name: string;
  missionType: MissionType;
  destination: Types.ObjectId; // ref Station
  startDate: Date;
  endDate: Date;
  status: ExpeditionStatus;
  assignedPersonnel: Types.ObjectId[];
  requiredResources: Array<{ item: string; quantity: number; unit: string }>;
  planningProgress: number; // 0–100
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expeditionSchema = new Schema<IExpedition>(
  {
    name: { type: String, required: true, trim: true },
    missionType: {
      type: String,
      enum: ['scientific', 'resupply', 'maintenance', 'emergency', 'survey'],
      required: true,
    },
    destination: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'planned', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },
    assignedPersonnel: [{ type: Schema.Types.ObjectId, ref: 'Personnel' }],
    requiredResources: [
      {
        item: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, required: true },
      },
    ],
    planningProgress: { type: Number, default: 0, min: 0, max: 100 },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

expeditionSchema.index({ status: 1 });
expeditionSchema.index({ destination: 1 });
expeditionSchema.index({ startDate: 1 });

export const Expedition = model<IExpedition>('Expedition', expeditionSchema);
