import { Schema, model, Document, Types } from 'mongoose';

export type ShipmentStatus =
  | 'created'
  | 'prepared'
  | 'dispatched'
  | 'in_transit'
  | 'delayed'
  | 'arrived'
  | 'received'
  | 'cancelled';

const VALID_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  created: ['prepared', 'cancelled'],
  prepared: ['dispatched', 'cancelled'],
  dispatched: ['in_transit', 'cancelled'],
  in_transit: ['delayed', 'arrived'],
  delayed: ['arrived'],
  arrived: ['received'],
  received: [],
  cancelled: [],
};

export const isValidShipmentTransition = (from: ShipmentStatus, to: ShipmentStatus) =>
  VALID_SHIPMENT_TRANSITIONS[from]?.includes(to) ?? false;

export interface ICargoItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  inventoryItemRef?: Types.ObjectId; // used during receive to update inventory
}

export interface IShipment extends Document {
  _id: Types.ObjectId;
  shipmentId: string; // generated, e.g. SHP-2026-0001
  origin: Types.ObjectId;
  destination: Types.ObjectId;
  linkedExpedition?: Types.ObjectId;
  cargoItems: ICargoItem[];
  estimatedArrival: Date;
  actualArrival?: Date;
  status: ShipmentStatus;
  receivedAt?: Date;
  receiveIdempotencyKey?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const cargoItemSchema = new Schema<ICargoItem>({
  name: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  inventoryItemRef: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
});

const shipmentSchema = new Schema<IShipment>(
  {
    shipmentId: { type: String, required: true, unique: true },
    origin: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    destination: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    linkedExpedition: { type: Schema.Types.ObjectId, ref: 'Expedition' },
    cargoItems: [cargoItemSchema],
    estimatedArrival: { type: Date, required: true },
    actualArrival: { type: Date },
    status: {
      type: String,
      enum: [
        'created','prepared','dispatched','in_transit','delayed','arrived','received','cancelled',
      ],
      default: 'created',
    },
    receivedAt: { type: Date },
    receiveIdempotencyKey: { type: String, unique: true, sparse: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

shipmentSchema.index({ status: 1 });
shipmentSchema.index({ destination: 1 });
shipmentSchema.index({ linkedExpedition: 1 });

export const Shipment = model<IShipment>('Shipment', shipmentSchema);
