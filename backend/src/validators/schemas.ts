import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([
    'admin','expedition_coordinator','logistics_officer','inventory_manager',
    'personnel_coordinator','emergency_coordinator','station_ops',
  ]),
  station: z.string().optional(),
});

// ── Expedition ─────────────────────────────────────────────────────────────
export const expeditionSchema = z.object({
  name: z.string().min(3).max(200),
  missionType: z.enum(['scientific','resupply','maintenance','emergency','survey']),
  destination: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  description: z.string().optional(),
  planningProgress: z.number().min(0).max(100).optional(),
  requiredResources: z.array(z.object({
    item: z.string(),
    quantity: z.number().min(0),
    unit: z.string(),
  })).optional(),
});

export const expeditionStatusSchema = z.object({
  status: z.enum(['draft','planned','active','completed','cancelled']),
});

// ── Shipment ───────────────────────────────────────────────────────────────
export const shipmentSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  linkedExpedition: z.string().optional(),
  estimatedArrival: z.string().datetime(),
  notes: z.string().optional(),
  cargoItems: z.array(z.object({
    name: z.string(),
    category: z.string(),
    quantity: z.number().min(0),
    unit: z.string(),
    inventoryItemRef: z.string().optional(),
  })).min(1),
});

export const shipmentStatusSchema = z.object({
  status: z.enum(['created','prepared','dispatched','in_transit','delayed','arrived','received','cancelled']),
});

export const shipmentReceiveSchema = z.object({
  idempotencyKey: z.string().uuid(),
  actualArrival: z.string().datetime().optional(),
});

// ── Inventory ──────────────────────────────────────────────────────────────
export const inventoryItemSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.enum(['food','fuel','medical','research_equipment','spare_parts',
    'protective_equipment','communication_supplies','other']),
  station: z.string().min(1),
  onHandQuantity: z.number().min(0),
  reservedQuantity: z.number().min(0).optional(),
  unit: z.string(),
  minThreshold: z.number().min(0),
  description: z.string().optional(),
});

export const inventoryTransactionSchema = z.object({
  item: z.string().min(1),
  type: z.enum(['receipt','consumption','adjustment']),
  quantity: z.number(),
  reason: z.string().min(3),
  relatedShipment: z.string().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

// ── Personnel ──────────────────────────────────────────────────────────────
export const personnelSchema = z.object({
  name: z.string().min(2).max(200),
  role: z.string().min(2),
  department: z.string().min(2),
  email: z.string().email(),
  linkedExpedition: z.string().optional(),
  assignedStation: z.string().optional(),
  currentStatus: z.enum([
    'assigned','preparing','in_transit','at_station',
    'on_assignment','returned','status_verification_required',
  ]).optional(),
});

export const personnelMovementSchema = z.object({
  personnel: z.string().min(1),
  eventType: z.enum(['check_in','check_out','status_update']),
  toStatus: z.enum([
    'assigned','preparing','in_transit','at_station',
    'on_assignment','returned','status_verification_required',
  ]),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// ── Asset ──────────────────────────────────────────────────────────────────
export const assetSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.string().min(2),
  assignedStation: z.string().optional(),
  assignedExpedition: z.string().optional(),
  condition: z.enum(['excellent','good','fair','poor']),
  status: z.enum(['operational','under_maintenance','fault_reported','out_of_service','retired']).optional(),
  acquisitionDate: z.string().datetime(),
  maintenanceIntervalDays: z.number().min(1),
  usageHoursThreshold: z.number().min(1),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const maintenanceRecordSchema = z.object({
  type: z.enum(['scheduled','corrective','fault_report']),
  description: z.string().min(5),
  performedBy: z.string().optional(),
  maintenanceDate: z.string().datetime(),
  nextScheduledDate: z.string().datetime().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
});

// ── Incident ───────────────────────────────────────────────────────────────
export const incidentSchema = z.object({
  type: z.enum(['medical','equipment_failure','weather','navigation',
    'supply_shortage','communication_loss','security','other']),
  description: z.string().min(10),
  location: z.string().min(2),
  station: z.string().optional(),
  severity: z.enum(['low','medium','high','critical']),
  linkedExpedition: z.string().optional(),
  requiredResources: z.array(z.string()).optional(),
  affectedPersonnel: z.array(z.string()).optional(),
});

export const incidentStatusSchema = z.object({
  status: z.enum(['reported','acknowledged','assessing','response_in_progress','resolved','closed']),
});

export const incidentActionSchema = z.object({
  action: z.string().min(3),
  performedBy: z.string().min(2),
  timestamp: z.string().datetime(),
  notes: z.string().optional(),
});

// ── Station ────────────────────────────────────────────────────────────────
export const stationSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(10),
  location: z.string().min(2),
  coordinates: z.object({ lat: z.number(), lon: z.number() }),
  status: z.enum(['active','inactive','winter-over']).optional(),
  timezone: z.string().optional(),
});

// ── Alert Acknowledge ──────────────────────────────────────────────────────
export const alertAcknowledgeSchema = z.object({
  notes: z.string().optional(),
});
