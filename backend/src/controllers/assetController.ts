import { Response } from 'express';
import { Asset } from '../models/Asset';
import { MaintenanceRecord } from '../models/Asset';
import { AuditLog, Alert } from '../models/Alert';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';

export const listAssets = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.station) filter.assignedStation = req.query.station;
  if (req.query.category) filter.category = req.query.category;

  const [assets, total] = await Promise.all([
    Asset.find(filter)
      .populate('assignedStation', 'name code')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Asset.countDocuments(filter),
  ]);
  sendSuccess(res, assets, 200, paginateMeta(total, page, limit));
};

export const createAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const assetId = generateSequentialId('AST', new Date().getFullYear());
  const body = { ...req.body, assetId };
  if (body.maintenanceIntervalDays && body.acquisitionDate) {
    const acq = new Date(body.acquisitionDate);
    const next = new Date(acq);
    next.setDate(next.getDate() + body.maintenanceIntervalDays);
    body.nextMaintenanceDue = next;
  }
  const asset = await Asset.create(body);
  await AuditLog.create({ action: 'create', entityType: 'Asset', entityId: asset._id, performedBy: req.user!._id });
  sendSuccess(res, asset, 201);
};

export const getAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const asset = await Asset.findById(req.params.id).populate('assignedStation', 'name code');
  if (!asset) { sendError(res, 'NOT_FOUND', 'Asset not found', 404); return; }
  sendSuccess(res, asset);
};

export const updateAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  const before = await Asset.findById(req.params.id);
  if (!before) { sendError(res, 'NOT_FOUND', 'Asset not found', 404); return; }

  const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await AuditLog.create({
    action: 'update',
    entityType: 'Asset',
    entityId: asset!._id,
    performedBy: req.user!._id,
    changes: { status: { before: before.status, after: asset!.status } },
  });
  sendSuccess(res, asset);
};

export const addMaintenanceRecord = async (req: AuthRequest, res: Response): Promise<void> => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) { sendError(res, 'NOT_FOUND', 'Asset not found', 404); return; }

  const record = await MaintenanceRecord.create({
    ...req.body,
    asset: asset._id,
    recordedBy: req.user!._id,
  });

  // Update asset maintenance dates
  asset.lastMaintenanceDate = new Date(req.body.maintenanceDate);
  if (req.body.nextScheduledDate) {
    asset.nextMaintenanceDue = new Date(req.body.nextScheduledDate);
  } else if (asset.maintenanceIntervalDays) {
    const next = new Date(req.body.maintenanceDate);
    next.setDate(next.getDate() + asset.maintenanceIntervalDays);
    asset.nextMaintenanceDue = next;
  }
  if (req.body.type === 'scheduled') asset.status = 'operational';
  await asset.save();

  // Resolve any open maintenance_due alert for this asset
  await Alert.findOneAndUpdate(
    { type: 'maintenance_due', entityId: asset._id, status: 'open' },
    { status: 'resolved' }
  );

  sendSuccess(res, record, 201);
};

export const getMaintenanceHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const records = await MaintenanceRecord.find({ asset: req.params.id })
    .populate('recordedBy', 'name')
    .sort({ maintenanceDate: -1 });
  sendSuccess(res, records);
};
