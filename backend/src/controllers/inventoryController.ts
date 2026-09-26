import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';

export const listInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  const where: any = {};
  if (req.query.station) where.stationId = req.query.station;
  if (req.query.category) where.category = req.query.category;
  if (req.query.lowStock === 'true') {
    // Items where onHandQuantity < minThreshold — use raw comparison (Prisma doesn't support cross-field compare natively)
    const lowItems = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM inventory_items WHERE CAST(on_hand_quantity AS DECIMAL) < CAST(min_threshold AS DECIMAL)
      ${req.query.station ? prisma.$queryRaw`AND station_id = ${req.query.station}` : prisma.$queryRaw``}
    `;
    where.id = { in: lowItems.map((r) => r.id) };
  }

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: { station: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inventoryItem.count({ where }),
  ]);
  sendSuccess(res, items, 200, paginateMeta(total, page, limit));
};

export const createInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await prisma.inventoryItem.create({
    data: req.body,
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  await prisma.auditLog.create({
    data: { action: 'create', entityType: 'InventoryItem', entityId: item.id, performedBy: req.user!.id },
  });
  sendSuccess(res, item, 201);
};

export const getInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: req.params.id },
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  if (!item) { sendError(res, 'NOT_FOUND', 'Inventory item not found', 404); return; }
  sendSuccess(res, item);
};

export const updateInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await prisma.inventoryItem.update({
    where: { id: req.params.id },
    data: req.body,
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  await prisma.auditLog.create({
    data: { action: 'update', entityType: 'InventoryItem', entityId: item.id, performedBy: req.user!.id },
  });
  sendSuccess(res, item);
};

export const recordTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { itemId, type, quantity, notes, referenceType, referenceId, clientMutationId } = req.body;

  // Idempotency check
  if (clientMutationId) {
    const existing = await prisma.inventoryTransaction.findUnique({ where: { clientMutationId } });
    if (existing) { sendSuccess(res, existing); return; }
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) { sendError(res, 'NOT_FOUND', 'Inventory item not found', 404); return; }

  const change = type === 'consumption' || type === 'outbound' ? -Math.abs(Number(quantity)) : Math.abs(Number(quantity));
  const newOnHand = Number(item.onHandQuantity) + change;
  const available = newOnHand - Number(item.reservedQuantity);

  if (available < 0) {
    sendError(res, 'CONFLICT', `Operation would result in negative available quantity (${available}). Available: ${Number(item.onHandQuantity) - Number(item.reservedQuantity)}`, 409);
    return;
  }

  const tx = await prisma.$transaction(async (prismaT) => {
    const updatedItem = await prismaT.inventoryItem.update({
      where: { id: itemId },
      data: { onHandQuantity: newOnHand },
    });

    const transaction = await prismaT.inventoryTransaction.create({
      data: {
        itemId,
        stationId: item.stationId,
        type,
        quantity: change,
        balanceAfter: newOnHand,
        referenceType,
        referenceId,
        notes,
        performedBy: req.user!.id,
        clientMutationId: clientMutationId || null,
      },
    });

    // Trigger low-stock alert
    if (newOnHand < Number(item.minThreshold)) {
      await prismaT.alert.upsert({
        where: { unique_open_alert: { type: 'low_stock', entityId: itemId, status: 'open' } },
        create: {
          type: 'low_stock',
          severity: newOnHand === 0 ? 'critical' : 'warning',
          entityType: 'InventoryItem',
          entityId: itemId,
          reason: `${item.name} is below minimum threshold. On-hand: ${newOnHand} ${item.unit}, threshold: ${item.minThreshold} ${item.unit}`,
          status: 'open',
        },
        update: {
          lastCheckedAt: new Date(),
          severity: newOnHand === 0 ? 'critical' : 'warning',
          reason: `${item.name} is below minimum threshold. On-hand: ${newOnHand} ${item.unit}, threshold: ${item.minThreshold} ${item.unit}`,
        },
      });
    }

    await prismaT.auditLog.create({
      data: { action: 'inventory_transaction', entityType: 'InventoryItem', entityId: itemId, performedBy: req.user!.id },
    });

    return transaction;
  });

  sendSuccess(res, tx, 201);
};

export const listTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

  const where: any = {};
  if (req.query.item) where.itemId = req.query.item;
  if (req.query.type) where.type = req.query.type;

  const [txns, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, unit: true, category: true } },
        performer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inventoryTransaction.count({ where }),
  ]);
  sendSuccess(res, txns, 200, paginateMeta(total, page, limit));
};

export const getForecast = async (req: AuthRequest, res: Response): Promise<void> => {
  const { computeForecast } = await import('../services/analyticsService');
  const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.itemId } });
  if (!item) { sendError(res, 'NOT_FOUND', 'Inventory item not found', 404); return; }

  const windowDays = parseInt(req.query.window as string) || 7;
  const forecast = await computeForecast(
    item.id,
    Number(item.onHandQuantity),
    Number(item.reservedQuantity),
    Number(item.minThreshold),
    item.unit,
    windowDays,
  );
  sendSuccess(res, forecast);
};
