import { Response } from 'express';
import { Expedition, isValidExpeditionTransition, ExpeditionStatus } from '../models/Expedition';
import { AuditLog } from '../models/Alert';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';

export const listExpeditions = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.destination) filter.destination = req.query.destination;
  if (req.query.startDate) filter.startDate = { $gte: new Date(req.query.startDate as string) };
  if (req.query.endDate) filter.endDate = { $lte: new Date(req.query.endDate as string) };

  const [expeditions, total] = await Promise.all([
    Expedition.find(filter)
      .populate('destination', 'name code')
      .populate('assignedPersonnel', 'name role')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit),
    Expedition.countDocuments(filter),
  ]);

  sendSuccess(res, expeditions, 200, paginateMeta(total, page, limit));
};

export const createExpedition = async (req: AuthRequest, res: Response): Promise<void> => {
  const expedition = await Expedition.create({ ...req.body, createdBy: req.user!._id });
  await AuditLog.create({
    action: 'create',
    entityType: 'Expedition',
    entityId: expedition._id,
    performedBy: req.user!._id,
  });
  sendSuccess(res, expedition, 201);
};

export const getExpedition = async (req: AuthRequest, res: Response): Promise<void> => {
  const expedition = await Expedition.findById(req.params.id)
    .populate('destination', 'name code location')
    .populate('assignedPersonnel', 'name role department');
  if (!expedition) { sendError(res, 'NOT_FOUND', 'Expedition not found', 404); return; }
  sendSuccess(res, expedition);
};

export const updateExpedition = async (req: AuthRequest, res: Response): Promise<void> => {
  const expedition = await Expedition.findById(req.params.id);
  if (!expedition) { sendError(res, 'NOT_FOUND', 'Expedition not found', 404); return; }

  if (req.body.status && req.body.status !== expedition.status) {
    if (!isValidExpeditionTransition(expedition.status, req.body.status as ExpeditionStatus)) {
      sendError(res, 'CONFLICT', `Cannot transition from ${expedition.status} to ${req.body.status}`, 409);
      return;
    }
  }

  const before = expedition.toObject();
  Object.assign(expedition, req.body);
  await expedition.save();

  await AuditLog.create({
    action: 'update',
    entityType: 'Expedition',
    entityId: expedition._id,
    performedBy: req.user!._id,
    changes: { before, after: expedition.toObject() } as any,
  });

  sendSuccess(res, expedition);
};

export const deleteExpedition = async (req: AuthRequest, res: Response): Promise<void> => {
  const expedition = await Expedition.findById(req.params.id);
  if (!expedition) { sendError(res, 'NOT_FOUND', 'Expedition not found', 404); return; }
  if (!['draft', 'planned'].includes(expedition.status)) {
    sendError(res, 'CONFLICT', 'Only draft or planned expeditions can be deleted', 409);
    return;
  }
  await expedition.deleteOne();
  await AuditLog.create({
    action: 'delete',
    entityType: 'Expedition',
    entityId: expedition._id,
    performedBy: req.user!._id,
  });
  sendSuccess(res, { message: 'Expedition deleted' });
};
