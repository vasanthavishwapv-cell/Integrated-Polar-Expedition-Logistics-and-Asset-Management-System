import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';
import { AssetStatus } from '@prisma/client';

export const listAssets = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  const where: any = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.station) where.stationId = req.query.station;
  if (req.query.category) where.category = req.query.category;

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { station: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.asset.count({ where }),
  ]);
  sendSuccess(res, assets, 200, paginateMeta(total, page, limit));
};

export const createAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const assetTag = req.body.assetTag || generateSequentialId('AST', new Date().getFullYear());
  const asset = await prisma.asset.create({
    data: { ...req.body, assetTag },
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  await prisma.auditLog.create({
    data: { action: 'create', entityType: 'Asset', entityId: asset.id, performedBy: req.user!.id },
  });
  sendSuccess(res, asset, 201);
};

export const getAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const asset = await prisma.asset.findUnique({
    where: { id: req.params.id },
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  if (!asset) { sendError(res, 'NOT_FOUND', 'Asset not found', 404); return; }
  sendSuccess(res, asset);
};

export const updateAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const before = await prisma.asset.findUnique({ where: { id: req.params.id } });
  if (!before) { sendError(res, 'NOT_FOUND', 'Asset not found', 404); return; }

  const asset = await prisma.asset.update({
    where: { id: req.params.id },
    data: req.body,
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  await prisma.auditLog.create({
    data: {
      action: 'update',
      entityType: 'Asset',
      entityId: asset.id,
      performedBy: req.user!.id,
      beforeJson: { status: before.status } as any,
      afterJson: { status: asset.status } as any,
    },
  });
  sendSuccess(res, asset);
};

export const addMaintenanceRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
  if (!asset) { sendError(res, 'NOT_FOUND', 'Asset not found', 404); return; }

  const record = await prisma.maintenanceRecord.create({
    data: {
      assetId: asset.id,
      serviceType: req.body.serviceType,
      hoursAtService: req.body.hoursAtService || asset.hourMeter,
      performedBy: req.user!.id,
      notes: req.body.notes,
      cost: req.body.cost || 0,
      nextServiceDue: req.body.nextServiceDue || (asset.nextServiceDue + 250),
    },
  });

  // Update asset's service tracking
  await prisma.asset.update({
    where: { id: asset.id },
    data: {
      lastServiceDate: new Date(),
      nextServiceDue: req.body.nextServiceDue || (asset.nextServiceDue + 250),
      status: req.body.serviceType === 'routine' || req.body.serviceType === 'repair' ? 'operational' : undefined,
    },
  });

  // Resolve open maintenance_due alerts for this asset
  await prisma.alert.updateMany({
    where: { type: 'maintenance_due', entityId: asset.id, status: 'open' },
    data: { status: 'resolved' },
  });

  sendSuccess(res, record, 201);
};

export const getMaintenanceHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const records = await prisma.maintenanceRecord.findMany({
    where: { assetId: req.params.id },
    include: { performer: { select: { id: true, name: true } } },
    orderBy: { performedAt: 'desc' },
  });
  sendSuccess(res, records);
};
