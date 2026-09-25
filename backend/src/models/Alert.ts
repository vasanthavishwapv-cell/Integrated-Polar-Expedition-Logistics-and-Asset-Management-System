import { Schema, model, Document, Types } from 'mongoose';

export type AlertType =
  | 'low_stock'
  | 'shipment_delayed'
  | 'forecast_threshold'
  | 'maintenance_due'
  | 'critical_incident_unacknowledged'
  | 'cargo_arrived_not_received'
  | 'inventory_inconsistency';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface IAcknowledgmentRecord {
  acknowledgedBy: Types.ObjectId;
  acknowledgedAt: Date;
  notes?: string;
}

export interface IAlert extends Document {
  _id: Types.ObjectId;
  type: AlertType;
  severity: AlertSeverity;
  entityType: string; // 'InventoryItem' | 'Shipment' | 'Asset' | 'Incident'
  entityId: Types.ObjectId;
  reason: string; // human-readable explanation
  explanation: {
    rule: string;
    inputs: Record<string, unknown>;
  };
  status: AlertStatus;
  acknowledgments: IAcknowledgmentRecord[];
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    type: {
      type: String,
      enum: [
        'low_stock','shipment_delayed','forecast_threshold','maintenance_due',
        'critical_incident_unacknowledged','cargo_arrived_not_received','inventory_inconsistency',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      required: true,
    },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    explanation: {
      rule: { type: String, required: true },
      inputs: { type: Schema.Types.Mixed, required: true },
    },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
    },
    acknowledgments: [
      {
        acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        acknowledgedAt: { type: Date, required: true },
        notes: { type: String },
      },
    ],
    lastCheckedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Deduplication index: one open alert per (type + entityId)
alertSchema.index({ type: 1, entityId: 1, status: 1 });
alertSchema.index({ status: 1, severity: 1 });

export const Alert = model<IAlert>('Alert', alertSchema);

// ── Audit Log ─────────────────────────────────────────────────────────────

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  performedBy: Types.ObjectId;
  changes?: Record<string, { before: unknown; after: unknown }>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changes: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
