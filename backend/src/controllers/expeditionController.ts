import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';
import { ExpeditionStatus } from '@prisma/client';

const VALID_EXPEDITION_TRANSITIONS: Record<string, string[]> = {
  draft: ['planned'],
  planned: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const listExpeditions = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  const where: any = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.destination) where.destinationId = req.query.destination;

  const [expeditions, total] = await Promise.all([
    prisma.expedition.findMany({
      where,
      include: { destination: { select: { id: true, name: true, code: true } } },
      orderBy: { startDate: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expedition.count({ where }),
  ]);

  sendSuccess(res, expeditions, 200, paginateMeta(total, page, limit));
};

export const createExpedition = async (req: AuthRequest, res: Response): Promise<void> => {
  const expedition = await prisma.expedition.create({
    data: { ...req.body, createdBy: req.user!.id },
    include: { destination: { select: { id: true, name: true, code: true } } },
  });
  await prisma.auditLog.create({
    data: { action: 'create', entityType: 'Expedition', entityId: expedition.id, performedBy: req.user!.id },
  });
  sendSuccess(res, expedition, 201);
};

export const getExpedition = async (req: AuthRequest, res: Response): Promise<void> => {
  const expedition = await prisma.expedition.findUnique({
    where: { id: req.params.id },
    include: { destination: { select: { id: true, name: true, code: true } }, creator: { select: { id: true, name: true } } },
  });
  if (!expedition) { sendError(res, 'NOT_FOUND', 'Expedition not found', 404); return; }
  sendSuccess(res, expedition);
};

export const updateExpedition = async (req: AuthRequest, res: Response): Promise<void> => {
  const before = await prisma.expedition.findUnique({ where: { id: req.params.id } });
  if (!before) { sendError(res, 'NOT_FOUND', 'Expedition not found', 404); return; }

  if (req.body.status && req.body.status !== before.status) {
    const allowed = VALID_EXPEDITION_TRANSITIONS[before.status] || [];
    if (!allowed.includes(req.body.status)) {
      sendError(res, 'CONFLICT', `Cannot transition from ${before.status} to ${req.body.status}`, 409);
      return;
    }
  }

  const expedition = await prisma.expedition.update({
    where: { id: req.params.id },
    data: req.body,
    include: { destination: { select: { id: true, name: true, code: true } } },
  });
  await prisma.auditLog.create({
    data: {
      action: 'update',
      entityType: 'Expedition',
      entityId: expedition.id,
      performedBy: req.user!.id,
      beforeJson: before as any,
      afterJson: expedition as any,
    },
  });
  sendSuccess(res, expedition);
};

export const deleteExpedition = async (req: AuthRequest, res: Response): Promise<void> => {
  const expedition = await prisma.expedition.findUnique({ where: { id: req.params.id } });
  if (!expedition) { sendError(res, 'NOT_FOUND', 'Expedition not found', 404); return; }
  if (expedition.status === 'active') {
    sendError(res, 'CONFLICT', 'Cannot delete an active expedition', 409);
    return;
  }
  await prisma.expedition.delete({ where: { id: req.params.id } });
  sendSuccess(res, { message: 'Expedition deleted' });
};
