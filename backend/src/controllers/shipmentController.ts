import { Response } from 'express';
import mongoose from 'mongoose';
import { Shipment, isValidShipmentTransition, ShipmentStatus } from '../models/Shipment';
import { InventoryItem, InventoryTransaction } from '../models/Inventory';
import { AuditLog } from '../models/Alert';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';

export const listShipments = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.destination) filter.destination = req.query.destination;
  if (req.query.linkedExpedition) filter.linkedExpedition = req.query.linkedExpedition;

  const [shipments, total] = await Promise.all([
    Shipment.find(filter)
      .populate('origin', 'name code')
      .populate('destination', 'name code')
      .populate('linkedExpedition', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Shipment.countDocuments(filter),
  ]);
  sendSuccess(res, shipments, 200, paginateMeta(total, page, limit));
};

export const createShipment = async (req: AuthRequest, res: Response): Promise<void> => {
  const shipmentId = generateSequentialId('SHP', new Date().getFullYear());
  const shipment = await Shipment.create({ ...req.body, shipmentId, createdBy: req.user!._id });
  await AuditLog.create({ action: 'create', entityType: 'Shipment', entityId: shipment._id, performedBy: req.user!._id });
  sendSuccess(res, shipment, 201);
};

export const getShipment = async (req: AuthRequest, res: Response): Promise<void> => {
  const shipment = await Shipment.findById(req.params.id)
    .populate('origin', 'name code')
    .populate('destination', 'name code')
    .populate('linkedExpedition', 'name status');
  if (!shipment) { sendError(res, 'NOT_FOUND', 'Shipment not found', 404); return; }
  sendSuccess(res, shipment);
};

export const updateShipmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) { sendError(res, 'NOT_FOUND', 'Shipment not found', 404); return; }

  if (!isValidShipmentTransition(shipment.status, status as ShipmentStatus)) {
    sendError(res, 'CONFLICT', `Cannot transition from ${shipment.status} to ${status}`, 409);
    return;
  }

  const before = shipment.status;
  shipment.status = status;
  if (status === 'arrived') shipment.actualArrival = new Date();
  await shipment.save();

  await AuditLog.create({
    action: 'status_change',
    entityType: 'Shipment',
    entityId: shipment._id,
    performedBy: req.user!._id,
    changes: { status: { before, after: status } },
  });
  sendSuccess(res, shipment);
};

export const receiveShipment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { idempotencyKey, actualArrival } = req.body;
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) { sendError(res, 'NOT_FOUND', 'Shipment not found', 404); return; }

  // Guard: must be in 'arrived' status
  if (shipment.status !== 'arrived') {
    sendError(res, 'CONFLICT', `Shipment must be in 'arrived' status before receiving. Current: ${shipment.status}`, 409);
    return;
  }

  // Idempotency: reject duplicate receipt
  const existing = await Shipment.findOne({ receiveIdempotencyKey: idempotencyKey });
  if (existing) {
    sendSuccess(res, shipment); // Already processed, return success idempotently
    return;
  }

  // Transactional update: shipment status + inventory quantities
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      shipment.status = 'received';
      shipment.receivedAt = new Date();
      shipment.receiveIdempotencyKey = idempotencyKey;
      if (actualArrival) shipment.actualArrival = new Date(actualArrival);
      await shipment.save({ session });

      // Update inventory for each cargo item that has an inventoryItemRef
      for (const cargoItem of shipment.cargoItems) {
        if (cargoItem.inventoryItemRef) {
          await InventoryItem.findByIdAndUpdate(
            cargoItem.inventoryItemRef,
            { $inc: { onHandQuantity: cargoItem.quantity } },
            { session }
          );
          await InventoryTransaction.create(
            [{
              item: cargoItem.inventoryItemRef,
              type: 'receipt',
              quantity: cargoItem.quantity,
              reason: `Shipment received: ${shipment.shipmentId}`,
              performedBy: req.user!._id,
              relatedShipment: shipment._id,
              idempotencyKey: `${idempotencyKey}-${cargoItem.inventoryItemRef}`,
            }],
            { session }
          );
        }
      }

      await AuditLog.create(
        [{
          action: 'receive',
          entityType: 'Shipment',
          entityId: shipment._id,
          performedBy: req.user!._id,
          metadata: { idempotencyKey },
        }],
        { session }
      );
    });
    sendSuccess(res, shipment);
  } catch (err) {
    sendError(res, 'INTERNAL_ERROR', 'Receipt transaction failed', 500);
  } finally {
    await session.endSession();
  }
};
