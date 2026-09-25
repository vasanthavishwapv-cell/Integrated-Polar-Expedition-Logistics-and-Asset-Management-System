import { Response } from 'express';
import { Expedition } from '../models/Expedition';
import { Shipment } from '../models/Shipment';
import { InventoryItem, InventoryTransaction } from '../models/Inventory';
import { Personnel } from '../models/Personnel';
import { Asset } from '../models/Asset';
import { Incident } from '../models/Incident';
import { Alert, AuditLog } from '../models/Alert';
import { Station } from '../models/Station';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

export const getDashboardSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [
    totalExpeditions, activeExpeditions, plannedExpeditions,
    shipmentsInTransit, delayedShipments,
    openInventoryAlerts,
    operationalAssets, totalAssets,
    openIncidents, criticalIncidents,
    activePersonnel,
    openAlerts,
  ] = await Promise.all([
    Expedition.countDocuments(),
    Expedition.countDocuments({ status: 'active' }),
    Expedition.countDocuments({ status: 'planned' }),
    Shipment.countDocuments({ status: 'in_transit' }),
    Shipment.countDocuments({ status: 'delayed' }),
    Alert.countDocuments({ type: 'low_stock', status: 'open' }),
    Asset.countDocuments({ status: 'operational' }),
    Asset.countDocuments(),
    Incident.countDocuments({ status: { $nin: ['resolved', 'closed'] } }),
    Incident.countDocuments({ severity: 'critical', status: { $nin: ['resolved', 'closed'] } }),
    Personnel.countDocuments({ currentStatus: { $in: ['at_station', 'on_assignment', 'in_transit'] } }),
    Alert.countDocuments({ status: 'open' }),
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
    // Expedition status distribution
    Expedition.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    // Shipment status distribution
    Shipment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    // Incident severity distribution
    Incident.aggregate([
      { $match: { status: { $nin: ['resolved', 'closed'] } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    // Inventory by category (total on-hand)
    InventoryItem.aggregate([
      { $group: { _id: '$category', totalOnHand: { $sum: '$onHandQuantity' }, itemCount: { $sum: 1 } } },
    ]),
    // Asset status distribution
    Asset.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    // Recent activity (last 20 audit logs)
    AuditLog.find()
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(20),
  ]);

  // 30-day consumption trend
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const consumptionTrend = await InventoryTransaction.aggregate([
    { $match: { type: 'consumption', createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: { $abs: '$quantity' } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  sendSuccess(res, {
    expeditionStatusDist,
    shipmentStatusDist,
    incidentSeverityDist,
    inventoryByCategory,
    assetStatusDist,
    consumptionTrend,
    recentActivity,
  });
};

export const getStations = async (_req: AuthRequest, res: Response): Promise<void> => {
  const stations = await Station.find().sort({ name: 1 });
  sendSuccess(res, stations);
};

export const createStation = async (req: AuthRequest, res: Response): Promise<void> => {
  const station = await Station.create(req.body);
  sendSuccess(res, station, 201);
};

export const getStation = async (req: AuthRequest, res: Response): Promise<void> => {
  const station = await Station.findById(req.params.id);
  if (!station) { 
    const { sendError } = await import('../utils/response');
    sendError(res, 'NOT_FOUND', 'Station not found', 404); 
    return; 
  }
  sendSuccess(res, station);
};

export const updateStation = async (req: AuthRequest, res: Response): Promise<void> => {
  const station = await Station.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!station) { 
    const { sendError } = await import('../utils/response');
    sendError(res, 'NOT_FOUND', 'Station not found', 404); 
    return; 
  }
  sendSuccess(res, station);
};
