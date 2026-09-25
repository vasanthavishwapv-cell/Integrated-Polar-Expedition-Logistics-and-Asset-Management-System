import { Response } from 'express';
import { Incident, isValidIncidentTransition, IncidentStatus } from '../models/Incident';
import { Alert, AuditLog } from '../models/Alert';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';

export const listIncidents = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.station) filter.station = req.query.station;

  const [incidents, total] = await Promise.all([
    Incident.find(filter)
      .populate('station', 'name code')
      .populate('assignedCoordinator', 'name')
      .sort({ reportedTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Incident.countDocuments(filter),
  ]);
  sendSuccess(res, incidents, 200, paginateMeta(total, page, limit));
};

export const createIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  const incidentId = generateSequentialId('INC', new Date().getFullYear());
  const incident = await Incident.create({
    ...req.body,
    incidentId,
    reportedBy: req.user!._id,
    reportedTime: new Date(),
  });

  // If critical: immediately create an unacknowledged alert
  if (incident.severity === 'critical') {
    await Alert.create({
      type: 'critical_incident_unacknowledged',
      severity: 'critical',
      entityType: 'Incident',
      entityId: incident._id,
      reason: `Critical incident ${incidentId} reported and unacknowledged`,
      explanation: {
        rule: 'critical_incident_sla',
        inputs: { severity: 'critical', status: 'reported', reportedTime: incident.reportedTime },
      },
    });
  }

  await AuditLog.create({ action: 'create', entityType: 'Incident', entityId: incident._id, performedBy: req.user!._id });
  sendSuccess(res, incident, 201);
};

export const getIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  const incident = await Incident.findById(req.params.id)
    .populate('station', 'name code')
    .populate('assignedCoordinator', 'name email')
    .populate('affectedPersonnel', 'name role')
    .populate('reportedBy', 'name');
  if (!incident) { sendError(res, 'NOT_FOUND', 'Incident not found', 404); return; }
  sendSuccess(res, incident);
};

export const updateIncidentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  const incident = await Incident.findById(req.params.id);
  if (!incident) { sendError(res, 'NOT_FOUND', 'Incident not found', 404); return; }

  if (!isValidIncidentTransition(incident.status, status as IncidentStatus)) {
    sendError(res, 'CONFLICT', `Cannot transition from ${incident.status} to ${status}`, 409);
    return;
  }

  const before = incident.status;
  incident.status = status;
  await incident.save();

  // Resolve critical unacknowledged alert if incident is acknowledged
  if (status === 'acknowledged') {
    await Alert.findOneAndUpdate(
      { type: 'critical_incident_unacknowledged', entityId: incident._id, status: 'open' },
      { status: 'resolved' }
    );
  }

  await AuditLog.create({
    action: 'status_change',
    entityType: 'Incident',
    entityId: incident._id,
    performedBy: req.user!._id,
    changes: { status: { before, after: status } },
  });
  sendSuccess(res, incident);
};

export const addResponseAction = async (req: AuthRequest, res: Response): Promise<void> => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) { sendError(res, 'NOT_FOUND', 'Incident not found', 404); return; }

  incident.responseActions.push({
    action: req.body.action,
    performedBy: req.body.performedBy,
    timestamp: new Date(req.body.timestamp),
    notes: req.body.notes,
  });
  await incident.save();
  sendSuccess(res, incident);
};
