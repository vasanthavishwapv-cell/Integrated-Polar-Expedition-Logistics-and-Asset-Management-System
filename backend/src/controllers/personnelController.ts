import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';
import { PersonnelStatus } from '@prisma/client';

export const listPersonnel = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  const where: any = {};
  if (req.query.status) where.currentStatus = req.query.status;
  if (req.query.station) where.stationId = req.query.station;

  // Station ops: can only see own station
  if (req.user?.role === 'station_ops' && req.user.stationId) {
    where.stationId = req.user.stationId;
  }

  const [personnel, total] = await Promise.all([
    prisma.personnel.findMany({
      where,
      include: { station: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.personnel.count({ where }),
  ]);
  sendSuccess(res, personnel, 200, paginateMeta(total, page, limit));
};

export const createPersonnel = async (req: AuthRequest, res: Response): Promise<void> => {
  const person = await prisma.personnel.create({
    data: req.body,
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  await prisma.auditLog.create({
    data: { action: 'create', entityType: 'Personnel', entityId: person.id, performedBy: req.user!.id },
  });
  sendSuccess(res, person, 201);
};

export const getPersonnel = async (req: AuthRequest, res: Response): Promise<void> => {
  const person = await prisma.personnel.findUnique({
    where: { id: req.params.id },
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  if (!person) { sendError(res, 'NOT_FOUND', 'Personnel not found', 404); return; }

  // Station ops: can only see own station
  if (req.user?.role === 'station_ops') {
    if (req.user.stationId !== person.stationId) {
      sendError(res, 'FORBIDDEN', 'Access denied', 403);
      return;
    }
  }
  sendSuccess(res, person);
};

export const updatePersonnel = async (req: AuthRequest, res: Response): Promise<void> => {
  const person = await prisma.personnel.update({
    where: { id: req.params.id },
    data: req.body,
    include: { station: { select: { id: true, name: true, code: true } } },
  });
  await prisma.auditLog.create({
    data: { action: 'update', entityType: 'Personnel', entityId: person.id, performedBy: req.user!.id },
  });
  sendSuccess(res, person);
};

export const recordMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  const { personnelId, toStatus } = req.body;
  const person = await prisma.personnel.findUnique({ where: { id: personnelId } });
  if (!person) { sendError(res, 'NOT_FOUND', 'Personnel not found', 404); return; }

  const updated = await prisma.personnel.update({
    where: { id: personnelId },
    data: { currentStatus: toStatus as PersonnelStatus },
  });
  await prisma.auditLog.create({
    data: {
      action: 'status_change',
      entityType: 'Personnel',
      entityId: person.id,
      performedBy: req.user!.id,
      beforeJson: { currentStatus: person.currentStatus } as any,
      afterJson: { currentStatus: toStatus } as any,
    },
  });
  sendSuccess(res, updated, 201);
};

export const getPersonnelHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const person = await prisma.personnel.findUnique({
    where: { id: req.params.id as string },
  });
  if (!person) {
    sendError(res, 'NOT_FOUND', 'Personnel not found', 404);
    return;
  }

  const history = await prisma.auditLog.findMany({
    where: { entityType: 'Personnel', entityId: person.id },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, history);
};

