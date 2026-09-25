import { Response } from 'express';
import { InventoryItem, InventoryTransaction } from '../models/Inventory';
import { Alert } from '../models/Alert';
import { AuditLog } from '../models/Alert';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { computeForecast } from '../services/analyticsService';

export const listInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const filter: Record<string, unknown> = {};
  if (req.query.station) filter.station = req.query.station;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.lowStock === 'true') {
    // Items where onHand < threshold — using $expr
    filter['$expr'] = { $lt: ['$onHandQuantity', '$minThreshold'] };
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .populate('station', 'name code')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    InventoryItem.countDocuments(filter),
  ]);
  sendSuccess(res, items, 200, paginateMeta(total, page, limit));
};

export const createInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await InventoryItem.create(req.body);
  await AuditLog.create({ action: 'create', entityType: 'InventoryItem', entityId: item._id, performedBy: req.user!._id });
  sendSuccess(res, item, 201);
};

export const getInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await InventoryItem.findById(req.params.id).populate('station', 'name code');
  if (!item) { sendError(res, 'NOT_FOUND', 'Inventory item not found', 404); return; }
  sendSuccess(res, item);
};

export const updateInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) { sendError(res, 'NOT_FOUND', 'Inventory item not found', 404); return; }
  await AuditLog.create({ action: 'update', entityType: 'InventoryItem', entityId: item._id, performedBy: req.user!._id });
  sendSuccess(res, item);
};

export const recordTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { item: itemId, type, quantity, reason, relatedShipment, idempotencyKey } = req.body;

  // Idempotency check
  if (idempotencyKey) {
    const existing = await InventoryTransaction.findOne({ idempotencyKey });
    if (existing) { sendSuccess(res, existing); return; }
  }

  const item = await InventoryItem.findById(itemId);
  if (!item) { sendError(res, 'NOT_FOUND', 'Inventory item not found', 404); return; }

  // Server-side enforce: available qty = onHand - reserved
  const change = type === 'consumption' ? -Math.abs(quantity) : quantity;
  const newOnHand = item.onHandQuantity + change;
  const available = newOnHand - item.reservedQuantity;

  if (available < 0) {
    sendError(res, 'CONFLICT', `Operation would result in negative available quantity (${available}). Available: ${item.onHandQuantity - item.reservedQuantity}`, 409);
    return;
  }

  item.onHandQuantity = newOnHand;
  await item.save();

  const tx = await InventoryTransaction.create({
    item: itemId,
    type,
    quantity: change,
    reason,
    performedBy: req.user!._id,
    relatedShipment,
    idempotencyKey,
  });

  // Trigger low-stock alert check asynchronously
  if (item.onHandQuantity < item.minThreshold) {
    // Upsert alert (dedup: one open alert per rule+entity)
    await Alert.findOneAndUpdate(
      { type: 'low_stock', entityId: item._id, status: 'open' },
      {
        type: 'low_stock',
        severity: item.onHandQuantity === 0 ? 'critical' : 'warning',
        entityType: 'InventoryItem',
        entityId: item._id,
        reason: `${item.name} is below minimum threshold. On-hand: ${item.onHandQuantity} ${item.unit}, threshold: ${item.minThreshold} ${item.unit}`,
        explanation: {
          rule: 'inventory_below_threshold',
          inputs: { onHand: item.onHandQuantity, threshold: item.minThreshold, unit: item.unit },
        },
        lastCheckedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  await AuditLog.create({ action: 'inventory_transaction', entityType: 'InventoryItem', entityId: item._id, performedBy: req.user!._id, metadata: { type, quantity: change } });
  sendSuccess(res, tx, 201);
};

export const listTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const filter: Record<string, unknown> = {};
  if (req.query.item) filter.item = req.query.item;
  if (req.query.type) filter.type = req.query.type;

  const [txns, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate('item', 'name unit category')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    InventoryTransaction.countDocuments(filter),
  ]);
  sendSuccess(res, txns, 200, paginateMeta(total, page, limit));
};

export const getForecast = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await InventoryItem.findById(req.params.itemId);
  if (!item) { sendError(res, 'NOT_FOUND', 'Inventory item not found', 404); return; }

  const windowDays = parseInt(req.query.window as string) || 7;
  const forecast = await computeForecast(item._id.toString(), item.onHandQuantity, item.reservedQuantity, item.minThreshold, item.unit, windowDays);
  sendSuccess(res, forecast);
};
