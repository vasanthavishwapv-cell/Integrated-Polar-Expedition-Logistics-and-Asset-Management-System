import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, paginateMeta } from '../utils/response';
import { generateSequentialId } from '../utils/idGenerator';
import { IncidentStatus } from '@prisma/client';

const VALID_INCIDENT_TRANSITIONS: Record<string, string[]> = {
  open: ['investigating'],
  investigating: ['mitigated', 'resolved'],
  mitigated: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

export const listIncidents = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  const where: any = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.severity) where.severity = req.query.severity;
  if (req.query.station) where.stationId = req.query.station;

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: {
        station: { select: { id: true, name: true, code: true } },
        reporter: { select: { id: true, name: true } },
      },
      orderBy: { reportedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.incident.count({ where }),
  ]);
  sendSuccess(res, incidents, 200, paginateMeta(total, page, limit));
};

export const createIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  const incidentNumber = generateSequentialId('INC', new Date().getFullYear());
  const incident = await prisma.incident.create({
    data: {
      ...req.body,
      incidentNumber,
      reportedBy: req.user!.id,
      reportedAt: new Date(),
    },
    include: {
      station: { select: { id: true, name: true, code: true } },
      reporter: { select: { id: true, name: true } },
    },
  });

  // Critical incidents: create immediate alert
  if (incident.severity === 'critical') {
    await prisma.alert.upsert({
      where: { unique_open_alert: { type: 'critical_incident_unacknowledged', entityId: incident.id, status: 'open' } },
      create: {
        type: 'critical_incident_unacknowledged',
        severity: 'critical',
        entityType: 'Incident',
        entityId: incident.id,
        reason: `Critical incident ${incidentNumber} reported and unacknowledged`,
        status: 'open',
      },
      update: { lastCheckedAt: new Date() },
    });
  }

  await prisma.auditLog.create({
    data: { action: 'create', entityType: 'Incident', entityId: incident.id, performedBy: req.user!.id },
  });
  sendSuccess(res, incident, 201);
};

export const getIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  const incident = await prisma.incident.findUnique({
    where: { id: req.params.id },
    include: {
      station: { select: { id: true, name: true, code: true } },
      reporter: { select: { id: true, name: true } },
      acknowledger: { select: { id: true, name: true } },
      resolver: { select: { id: true, name: true } },
      expedition: { select: { id: true, name: true } },
    },
  });
  if (!incident) { sendError(res, 'NOT_FOUND', 'Incident not found', 404); return; }
  sendSuccess(res, incident);
};

export const updateIncidentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  const incident = await prisma.incident.findUnique({ where: { id: req.params.id } });
  if (!incident) { sendError(res, 'NOT_FOUND', 'Incident not found', 404); return; }

  const allowed = VALID_INCIDENT_TRANSITIONS[incident.status] || [];
  if (!allowed.includes(status)) {
    sendError(res, 'CONFLICT', `Cannot transition from ${incident.status} to ${status}`, 409);
    return;
  }

  const before = incident.status;
  const updateData: any = { status: status as IncidentStatus };

  if (status === 'investigating') {
    updateData.acknowledgedAt = new Date();
    updateData.acknowledgedBy = req.user!.id;
  }
  if (status === 'resolved' || status === 'closed') {
    updateData.resolvedAt = new Date();
    updateData.resolvedBy = req.user!.id;
    if (req.body.resolutionNotes) updateData.resolutionNotes = req.body.resolutionNotes;
  }

  const updated = await prisma.incident.update({
    where: { id: req.params.id },
    data: updateData,
  });

  // Resolve critical unacknowledged alert when acknowledged
  if (status === 'investigating') {
    await prisma.alert.updateMany({
      where: { type: 'critical_incident_unacknowledged', entityId: incident.id, status: 'open' },
      data: { status: 'resolved' },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: 'status_change',
      entityType: 'Incident',
      entityId: incident.id,
      performedBy: req.user!.id,
      beforeJson: { status: before } as any,
      afterJson: { status } as any,
    },
  });
  sendSuccess(res, updated);
};

export const addResponseAction = async (req: AuthRequest, res: Response): Promise<void> => {
  const incident = await prisma.incident.findUnique({ where: { id: req.params.id as string } });
  if (!incident) {
    sendError(res, 'NOT_FOUND', 'Incident not found', 404);
    return;
  }

  const actionText = `[${new Date().toISOString()}] ${req.body.action || 'Action taken'}${req.body.notes ? `: ${req.body.notes}` : ''}`;
  const updatedNotes = incident.resolutionNotes ? `${incident.resolutionNotes}\n${actionText}` : actionText;

  const updated = await prisma.incident.update({
    where: { id: incident.id },
    data: { resolutionNotes: updatedNotes },
  });

  await prisma.auditLog.create({
    data: {
      action: 'response_action',
      entityType: 'Incident',
      entityId: incident.id,
      performedBy: req.user!.id,
      afterJson: req.body,
    },
  });

  sendSuccess(res, updated);
};

