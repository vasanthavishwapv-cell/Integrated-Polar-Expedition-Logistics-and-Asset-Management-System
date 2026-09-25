import { Response } from 'express';
import { Alert } from '../models/Alert';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { runAlertEngine } from '../services/analyticsService';

export const listAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.type) filter.type = req.query.type;

  const [alerts, total] = await Promise.all([
    Alert.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Alert.countDocuments(filter),
  ]);
  sendSuccess(res, alerts, 200, paginateMeta(total, page, limit));
};

export const acknowledgeAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) { sendError(res, 'NOT_FOUND', 'Alert not found', 404); return; }
  if (alert.status !== 'open') {
    sendError(res, 'CONFLICT', 'Alert is not open', 409);
    return;
  }

  alert.status = 'acknowledged';
  alert.acknowledgments.push({
    acknowledgedBy: req.user!._id,
    acknowledgedAt: new Date(),
    notes: req.body.notes,
  });
  await alert.save();
  sendSuccess(res, alert);
};

export const triggerAlertEngine = async (_req: AuthRequest, res: Response): Promise<void> => {
  await runAlertEngine();
  sendSuccess(res, { message: 'Alert engine run complete' });
};
