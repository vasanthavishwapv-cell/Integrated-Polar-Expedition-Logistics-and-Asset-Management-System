import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

export const getDashboardSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [
    totalExpeditions,
    activeExpeditions,
    plannedExpeditions,
    shipmentsInTransit,
    delayedShipments,
    openInventoryAlerts,
    operationalAssets,
    totalAssets,
    openIncidents,
    criticalIncidents,
    activePersonnel,
    openAlerts,
  ] = await Promise.all([
    prisma.expedition.count(),
    prisma.expedition.count({ where: { status: 'active' } }),
    prisma.expedition.count({ where: { status: 'planned' } }),
    prisma.shipment.count({ where: { status: 'in_transit' } }),
    prisma.shipment.count({ where: { status: 'delayed' } }),
    prisma.alert.count({ where: { type: 'low_stock', status: 'open' } }),
    prisma.asset.count({ where: { status: 'operational' } }),
    prisma.asset.count(),
    prisma.incident.count({ where: { status: { notIn: ['resolved', 'closed'] } } }),
    prisma.incident.count({ where: { severity: 'critical', status: { notIn: ['resolved', 'closed'] } } }),
    prisma.personnel.count({ where: { currentStatus: { in: ['at_station', 'on_assignment', 'in_transit'] } } }),
    prisma.alert.count({ where: { status: 'open' } }),
  ]);

  sendSuccess(res, {
    kpis: {
      totalExpeditions,
      activeExpeditions,
      plannedExpeditions,
      shipmentsInTransit,
      delayedShipments,
      openInventoryAlerts,
      operationalAssets,
      totalAssets,
      openIncidents,
      criticalIncidents,
      activePersonnel,
      openAlerts,
    },
  });
};

export const getDashboardAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [
    expeditionStatusDist,
    shipmentStatusDist,
    incidentSeverityDist,
    inventoryByCategory,
    assetStatusDist,
    recentActivity,
  ] = await Promise.all([
    prisma.expedition.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.shipment.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.incident.groupBy({
      by: ['severity'],
      where: { status: { notIn: ['resolved', 'closed'] } },
      _count: { id: true },
    }),
    prisma.inventoryItem.groupBy({
      by: ['category'],
      _count: { id: true },
      _sum: { onHandQuantity: true },
    }),
    prisma.asset.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.auditLog.findMany({
      include: { performer: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  // 30-day consumption trend via raw SQL
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const consumptionTrend = await prisma.$queryRaw<{ day: string; total: number }[]>`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m-%d') as day,
      SUM(ABS(quantity)) as total
    FROM inventory_transactions
    WHERE type = 'consumption' AND created_at >= ${thirtyDaysAgo}
    GROUP BY day
    ORDER BY day ASC
  `;

  sendSuccess(res, {
    expeditionStatusDist: expeditionStatusDist.map((r) => ({ _id: r.status, count: r._count.id })),
    shipmentStatusDist: shipmentStatusDist.map((r) => ({ _id: r.status, count: r._count.id })),
    incidentSeverityDist: incidentSeverityDist.map((r) => ({ _id: r.severity, count: r._count.id })),
    inventoryByCategory: inventoryByCategory.map((r) => ({
      _id: r.category,
      totalOnHand: r._sum.onHandQuantity,
      itemCount: r._count.id,
    })),
    assetStatusDist: assetStatusDist.map((r) => ({ _id: r.status, count: r._count.id })),
    consumptionTrend: consumptionTrend.map((r) => ({ _id: r.day, total: r.total })),
    recentActivity,
  });
};

export const getStations = async (_req: AuthRequest, res: Response): Promise<void> => {
  const stations = await prisma.station.findMany({ orderBy: { name: 'asc' } });
  sendSuccess(res, stations);
};

export const createStation = async (req: AuthRequest, res: Response): Promise<void> => {
  const station = await prisma.station.create({ data: req.body });
  sendSuccess(res, station, 201);
};

export const getStation = async (req: AuthRequest, res: Response): Promise<void> => {
  const station = await prisma.station.findUnique({ where: { id: req.params.id } });
  if (!station) { sendError(res, 'NOT_FOUND', 'Station not found', 404); return; }
  sendSuccess(res, station);
};

export const updateStation = async (req: AuthRequest, res: Response): Promise<void> => {
  const station = await prisma.station.update({
    where: { id: req.params.id },
    data: req.body,
  });
  sendSuccess(res, station);
};
