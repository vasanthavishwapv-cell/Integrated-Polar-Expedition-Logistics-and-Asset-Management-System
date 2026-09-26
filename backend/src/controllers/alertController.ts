import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { runAlertEngine } from '../services/analyticsService';

export const listAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

  const where: any = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.severity) where.severity = req.query.severity;
  if (req.query.type) where.type = req.query.type;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.alert.count({ where }),
  ]);
  sendSuccess(res, alerts, 200, paginateMeta(total, page, limit));
};

export const acknowledgeAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
  if (!alert) { sendError(res, 'NOT_FOUND', 'Alert not found', 404); return; }
  if (alert.status !== 'open') {
    sendError(res, 'CONFLICT', 'Alert is not open', 409);
    return;
  }

  const updated = await prisma.alert.update({
    where: { id: alert.id },
    data: { status: 'acknowledged' },
  });
  sendSuccess(res, updated);
};

export const triggerAlertEngine = async (_req: AuthRequest, res: Response): Promise<void> => {
  await runAlertEngine();
  sendSuccess(res, { message: 'Alert engine run complete' });
};
