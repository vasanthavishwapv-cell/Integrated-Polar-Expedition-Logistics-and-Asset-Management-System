import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';
import { ShipmentStatus } from '@prisma/client';

const VALID_SHIPMENT_TRANSITIONS: Record<string, string[]> = {
  manifest_created: ['in_transit', 'cancelled'],
  in_transit: ['arrived', 'delayed', 'cancelled'],
  delayed: ['in_transit', 'arrived', 'cancelled'],
  arrived: ['received'],
  received: [],
  cancelled: [],
};

export const listShipments = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  const where: any = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.destination) where.destinationId = req.query.destination;
  if (req.query.expedition) where.expeditionId = req.query.expedition;

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: {
        destination: { select: { id: true, name: true, code: true } },
        expedition: { select: { id: true, name: true } },
        cargoItems: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.shipment.count({ where }),
  ]);
  sendSuccess(res, shipments, 200, paginateMeta(total, page, limit));
};

export const createShipment = async (req: AuthRequest, res: Response): Promise<void> => {
  const shipmentNumber = generateSequentialId('SHP', new Date().getFullYear());
  const { cargoItems, ...rest } = req.body;

  const shipment = await prisma.shipment.create({
    data: {
      ...rest,
      shipmentNumber,
      cargoItems: cargoItems
        ? { create: cargoItems }
        : undefined,
    },
    include: {
      destination: { select: { id: true, name: true, code: true } },
      cargoItems: true,
    },
  });
  await prisma.auditLog.create({
    data: { action: 'create', entityType: 'Shipment', entityId: shipment.id, performedBy: req.user!.id },
  });
  sendSuccess(res, shipment, 201);
};

export const getShipment = async (req: AuthRequest, res: Response): Promise<void> => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: req.params.id },
    include: {
      destination: { select: { id: true, name: true, code: true } },
      expedition: { select: { id: true, name: true, status: true } },
      cargoItems: true,
    },
  });
  if (!shipment) { sendError(res, 'NOT_FOUND', 'Shipment not found', 404); return; }
  sendSuccess(res, shipment);
};

export const updateShipmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
  if (!shipment) { sendError(res, 'NOT_FOUND', 'Shipment not found', 404); return; }

  const allowed = VALID_SHIPMENT_TRANSITIONS[shipment.status] || [];
  if (!allowed.includes(status)) {
    sendError(res, 'CONFLICT', `Cannot transition from ${shipment.status} to ${status}`, 409);
    return;
  }

  const before = shipment.status;
  const updated = await prisma.shipment.update({
    where: { id: req.params.id },
    data: {
      status: status as ShipmentStatus,
      actualArrival: status === 'arrived' ? new Date() : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'status_change',
      entityType: 'Shipment',
      entityId: updated.id,
      performedBy: req.user!.id,
      beforeJson: { status: before } as any,
      afterJson: { status } as any,
    },
  });
  sendSuccess(res, updated);
};

export const receiveShipment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { clientMutationId, actualArrival } = req.body;
  const shipment = await prisma.shipment.findUnique({
    where: { id: req.params.id },
    include: { cargoItems: true },
  });
  if (!shipment) { sendError(res, 'NOT_FOUND', 'Shipment not found', 404); return; }

  if (shipment.status !== 'arrived') {
    sendError(res, 'CONFLICT', `Shipment must be 'arrived' before receiving. Current: ${shipment.status}`, 409);
    return;
  }

  // Idempotency check
  if (clientMutationId) {
    const existing = await prisma.shipment.findFirst({ where: { clientMutationId } });
    if (existing) { sendSuccess(res, existing); return; }
  }

  // Prisma interactive transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.shipment.update({
      where: { id: req.params.id },
      data: {
        status: 'received',
        actualArrival: actualArrival ? new Date(actualArrival) : new Date(),
        clientMutationId: clientMutationId || null,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'receive',
        entityType: 'Shipment',
        entityId: updated.id,
        performedBy: req.user!.id,
        clientMutationId: clientMutationId || null,
      },
    });

    return updated;
  });

  sendSuccess(res, result);
};
