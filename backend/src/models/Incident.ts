import { Schema, model, Document, Types } from 'mongoose';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus =
  | 'reported'
  | 'acknowledged'
  | 'assessing'
  | 'response_in_progress'
  | 'resolved'
  | 'closed';
export type IncidentType =
  | 'medical'
  | 'equipment_failure'
  | 'weather'
  | 'navigation'
  | 'supply_shortage'
  | 'communication_loss'
  | 'security'
  | 'other';

const VALID_INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  reported: ['acknowledged'],
  acknowledged: ['assessing'],
  assessing: ['response_in_progress', 'resolved'],
  response_in_progress: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

export const isValidIncidentTransition = (from: IncidentStatus, to: IncidentStatus) =>
  VALID_INCIDENT_TRANSITIONS[from]?.includes(to) ?? false;

export interface IResponseAction {
  action: string;
  performedBy: string;
  timestamp: Date;
  notes?: string;
}

export interface IIncident extends Document {
  _id: Types.ObjectId;
  incidentId: string;
  type: IncidentType;
  description: string;
  location: string;
  station?: Types.ObjectId;
  reportedTime: Date;
  severity: IncidentSeverity;
  status: IncidentStatus;
  assignedCoordinator?: Types.ObjectId;
  requiredResources: string[];
  linkedExpedition?: Types.ObjectId;
  affectedPersonnel: Types.ObjectId[];
  responseActions: IResponseAction[];
  resolutionNotes?: string;
  reportedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const responseActionSchema = new Schema<IResponseAction>({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  timestamp: { type: Date, required: true },
  notes: { type: String },
});

const incidentSchema = new Schema<IIncident>(
  {
    incidentId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['medical','equipment_failure','weather','navigation',
             'supply_shortage','communication_loss','security','other'],
      required: true,
    },
    description: { type: String, required: true },
    location: { type: String, required: true },
    station: { type: Schema.Types.ObjectId, ref: 'Station' },
    reportedTime: { type: Date, required: true, default: Date.now },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    status: {
      type: String,
      enum: ['reported','acknowledged','assessing','response_in_progress','resolved','closed'],
      default: 'reported',
    },
    assignedCoordinator: { type: Schema.Types.ObjectId, ref: 'User' },
    requiredResources: [{ type: String }],
    linkedExpedition: { type: Schema.Types.ObjectId, ref: 'Expedition' },
    affectedPersonnel: [{ type: Schema.Types.ObjectId, ref: 'Personnel' }],
    responseActions: [responseActionSchema],
    resolutionNotes: { type: String },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

incidentSchema.index({ status: 1, severity: 1 });
incidentSchema.index({ station: 1 });
incidentSchema.index({ reportedTime: -1 });

export const Incident = model<IIncident>('Incident', incidentSchema);
