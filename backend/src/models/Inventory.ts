import { Schema, model, Document, Types } from 'mongoose';

export type InventoryCategory =
  | 'food'
  | 'fuel'
  | 'medical'
  | 'research_equipment'
  | 'spare_parts'
  | 'protective_equipment'
  | 'communication_supplies'
  | 'other';

export interface IInventoryItem extends Document {
  _id: Types.ObjectId;
  name: string;
  category: InventoryCategory;
  station: Types.ObjectId;
  onHandQuantity: number;
  reservedQuantity: number;
  unit: string;
  minThreshold: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'food','fuel','medical','research_equipment','spare_parts',
        'protective_equipment','communication_supplies','other',
      ],
      required: true,
    },
    station: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    onHandQuantity: { type: Number, required: true, min: 0, default: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true },
    minThreshold: { type: Number, required: true, min: 0 },
    description: { type: String },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ station: 1, category: 1 });
inventoryItemSchema.index({ name: 'text' });

// Virtual: available quantity (never stored, computed on read)
inventoryItemSchema.virtual('availableQuantity').get(function (this: IInventoryItem) {
  return this.onHandQuantity - this.reservedQuantity;
});

inventoryItemSchema.set('toJSON', { virtuals: true });
inventoryItemSchema.set('toObject', { virtuals: true });

export const InventoryItem = model<IInventoryItem>('InventoryItem', inventoryItemSchema);

// ── Inventory Transaction ──────────────────────────────────────────────────

export type TransactionType = 'receipt' | 'consumption' | 'adjustment';

export interface IInventoryTransaction extends Document {
  _id: Types.ObjectId;
  item: Types.ObjectId;
  type: TransactionType;
  quantity: number; // positive for receipt/adjustment-in, negative for consumption/adjustment-out
  reason: string;
  performedBy: Types.ObjectId;
  relatedShipment?: Types.ObjectId;
  idempotencyKey?: string; // for offline sync
  createdAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    type: {
      type: String,
      enum: ['receipt', 'consumption', 'adjustment'],
      required: true,
    },
    quantity: { type: Number, required: true },
    reason: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relatedShipment: { type: Schema.Types.ObjectId, ref: 'Shipment' },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ item: 1, createdAt: -1 });

export const InventoryTransaction = model<IInventoryTransaction>(
  'InventoryTransaction',
  inventoryTransactionSchema
);
