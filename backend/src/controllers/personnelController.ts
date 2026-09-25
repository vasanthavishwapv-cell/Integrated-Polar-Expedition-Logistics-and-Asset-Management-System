import { Response } from 'express';
import { Personnel, PersonnelMovement } from '../models/Personnel';
import { AuditLog } from '../models/Alert';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';

export const listPersonnel = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.currentStatus = req.query.status;
  if (req.query.station) filter.assignedStation = req.query.station;

  // Station ops: can only see own station
  if (req.user?.role === 'station_ops' && req.user.station) {
    filter.assignedStation = req.user.station;
  }

  const [personnel, total] = await Promise.all([
    Personnel.find(filter)
      .populate('assignedStation', 'name code')
      .populate('linkedExpedition', 'name status')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Personnel.countDocuments(filter),
  ]);
  sendSuccess(res, personnel, 200, paginateMeta(total, page, limit));
};

export const createPersonnel = async (req: AuthRequest, res: Response): Promise<void> => {
  const personnelId = generateSequentialId('PRS', new Date().getFullYear());
  const person = await Personnel.create({ ...req.body, personnelId });
  await AuditLog.create({ action: 'create', entityType: 'Personnel', entityId: person._id, performedBy: req.user!._id });
  sendSuccess(res, person, 201);
};

export const getPersonnel = async (req: AuthRequest, res: Response): Promise<void> => {
  const person = await Personnel.findById(req.params.id)
    .populate('assignedStation', 'name code')
    .populate('linkedExpedition', 'name status');
  if (!person) { sendError(res, 'NOT_FOUND', 'Personnel not found', 404); return; }

  // Station ops: can only see own record or station roster
  if (req.user?.role === 'station_ops') {
    const stationMatch = req.user.station?.toString() === person.assignedStation?._id?.toString();
    if (!stationMatch) { sendError(res, 'FORBIDDEN', 'Access denied', 403); return; }
  }
  sendSuccess(res, person);
};

export const recordMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  const person = await Personnel.findById(req.body.personnel);
  if (!person) { sendError(res, 'NOT_FOUND', 'Personnel not found', 404); return; }

  const fromStatus = person.currentStatus;
  person.currentStatus = req.body.toStatus;
  await person.save();

  const movement = await PersonnelMovement.create({
    ...req.body,
    fromStatus,
    recordedBy: req.user!._id,
  });
  sendSuccess(res, movement, 201);
};

export const getPersonnelHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const movements = await PersonnelMovement.find({ personnel: req.params.id })
    .populate('recordedBy', 'name')
    .sort({ createdAt: -1 });
  sendSuccess(res, movements);
};
