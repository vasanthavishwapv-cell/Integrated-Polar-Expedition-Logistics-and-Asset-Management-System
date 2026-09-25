import { Types } from 'mongoose';
import { InventoryTransaction } from '../models/Inventory';
import { Alert } from '../models/Alert';
import { Shipment } from '../models/Shipment';
import { Asset } from '../models/Asset';
import { Incident } from '../models/Incident';
import { InventoryItem } from '../models/Inventory';
import { config } from '../config';

// ── §6.1 Inventory Depletion Forecast ────────────────────────────────────
export interface ForecastResult {
  itemId: string;
  windowDays: number;
  estimatedDailyUsage: number;
  estimatedDaysRemaining: number | null;
  estimatedDepletionDate: Date | null;
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  availableQuantity: number;
  threshold: number;
  unit: string;
  historicalData: Array<{ date: string; consumption: number }>;
  explanation: {
    formula: string;
    inputs: Record<string, unknown>;
  };
}

export const computeForecast = async (
  itemId: string,
  onHand: number,
  reserved: number,
  threshold: number,
  unit: string,
  windowDays: number = config.forecast.defaultWindowDays
): Promise<ForecastResult> => {
  const available = onHand - reserved;
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  // Get consumption transactions for the window
  const transactions = await InventoryTransaction.find({
    item: itemId,
    type: 'consumption',
    createdAt: { $gte: windowStart },
  }).sort({ createdAt: 1 });

  // Build daily consumption map
  const dailyMap: Record<string, number> = {};
  for (const tx of transactions) {
    const day = tx.createdAt.toISOString().split('T')[0];
    dailyMap[day] = (dailyMap[day] || 0) + Math.abs(tx.quantity);
  }

  const historicalData = Object.entries(dailyMap).map(([date, consumption]) => ({
    date,
    consumption,
  }));

  const daysWithData = Object.keys(dailyMap).length;

  let confidence: ForecastResult['confidence'];
  if (daysWithData === 0) {
    confidence = 'insufficient_data';
  } else if (daysWithData >= windowDays) {
    confidence = 'high';
  } else if (daysWithData >= Math.floor(windowDays / 2)) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  const totalConsumption = Object.values(dailyMap).reduce((s, v) => s + v, 0);
  const estimatedDailyUsage = daysWithData > 0 ? totalConsumption / windowDays : 0;

  let estimatedDaysRemaining: number | null = null;
  let estimatedDepletionDate: Date | null = null;

  if (estimatedDailyUsage > 0) {
    estimatedDaysRemaining = available / estimatedDailyUsage;
    const depDate = new Date();
    depDate.setDate(depDate.getDate() + Math.round(estimatedDaysRemaining));
    estimatedDepletionDate = depDate;
  }

  return {
    itemId,
    windowDays,
    estimatedDailyUsage,
    estimatedDaysRemaining,
    estimatedDepletionDate,
    confidence,
    availableQuantity: available,
    threshold,
    unit,
    historicalData,
    explanation: {
      formula: `estimatedDailyUsage = sum(consumption over last ${windowDays} days) / ${windowDays}; estimatedDaysRemaining = availableQuantity / estimatedDailyUsage`,
      inputs: {
        windowDays,
        daysWithData,
        totalConsumption,
        availableQuantity: available,
        onHandQuantity: onHand,
        reservedQuantity: reserved,
      },
    },
  };
};

// ── §6.2 Alert Engine (rule evaluation) ──────────────────────────────────
export const runAlertEngine = async (): Promise<void> => {
  await Promise.allSettled([
    checkLowStockAlerts(),
    checkDelayedShipments(),
    checkMaintenanceDue(),
    checkCriticalIncidentSLA(),
    checkCargoArrivedNotReceived(),
    checkInventoryInconsistencies(),
    checkForecastThreshold(),
  ]);
};

const upsertAlert = async (
  type: string,
  entityType: string,
  entityId: string,
  severity: string,
  reason: string,
  explanation: { rule: string; inputs: Record<string, unknown> }
) => {
  await (Alert as any).findOneAndUpdate(
    { type, entityId: new Types.ObjectId(entityId), status: 'open' },
    { type, severity, entityType, entityId: new Types.ObjectId(entityId), reason, explanation, lastCheckedAt: new Date() },
    { upsert: true, new: true }
  );
};

const checkLowStockAlerts = async () => {
  const lowItems = await InventoryItem.find({
    $expr: { $lt: ['$onHandQuantity', '$minThreshold'] },
  });
  for (const item of lowItems) {
    await upsertAlert(
      'low_stock', 'InventoryItem', item._id.toString(),
      item.onHandQuantity === 0 ? 'critical' : 'warning',
      `${item.name} on-hand (${item.onHandQuantity} ${item.unit}) is below minimum threshold (${item.minThreshold} ${item.unit})`,
      { rule: 'inventory_below_threshold', inputs: { onHand: item.onHandQuantity, threshold: item.minThreshold } }
    );
  }
};

const checkDelayedShipments = async () => {
  const overdue = await Shipment.find({
    status: { $in: ['in_transit', 'dispatched'] },
    estimatedArrival: { $lt: new Date() },
  });
  for (const s of overdue) {
    await upsertAlert(
      'shipment_delayed', 'Shipment', s._id.toString(), 'warning',
      `Shipment ${s.shipmentId} is past estimated arrival (${s.estimatedArrival.toISOString()})`,
      { rule: 'shipment_past_eta', inputs: { eta: s.estimatedArrival, status: s.status } }
    );
  }
};

const checkMaintenanceDue = async () => {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const assets = await Asset.find({
    status: 'operational',
    nextMaintenanceDue: { $lte: sevenDaysFromNow },
  });
  for (const a of assets) {
    const daysUntil = a.nextMaintenanceDue
      ? Math.round((a.nextMaintenanceDue.getTime() - Date.now()) / 86400000)
      : 0;
    await upsertAlert(
      'maintenance_due', 'Asset', a._id.toString(),
      daysUntil <= 0 ? 'critical' : 'warning',
      `${a.name} maintenance due ${daysUntil <= 0 ? 'now (overdue)' : `in ${daysUntil} day(s)`}`,
      { rule: 'maintenance_date_threshold', inputs: { nextDue: a.nextMaintenanceDue, daysUntil } }
    );
  }
};

const checkCriticalIncidentSLA = async () => {
  const slaMs = config.alert.criticalIncidentSlaMinutes * 60 * 1000;
  const cutoff = new Date(Date.now() - slaMs);
  const criticalUnacked = await Incident.find({
    severity: 'critical',
    status: 'reported',
    reportedTime: { $lt: cutoff },
  });
  for (const inc of criticalUnacked) {
    await upsertAlert(
      'critical_incident_unacknowledged', 'Incident', inc._id.toString(), 'critical',
      `Critical incident ${inc.incidentId} has not been acknowledged within ${config.alert.criticalIncidentSlaMinutes} minutes`,
      { rule: 'critical_incident_sla', inputs: { slaMinutes: config.alert.criticalIncidentSlaMinutes, reportedTime: inc.reportedTime } }
    );
  }
};

const checkCargoArrivedNotReceived = async () => {
  const windowMs = config.alert.cargoArrivedNotReceivedHours * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - windowMs);
  const arrived = await Shipment.find({ status: 'arrived', actualArrival: { $lt: cutoff } });
  for (const s of arrived) {
    await upsertAlert(
      'cargo_arrived_not_received', 'Shipment', s._id.toString(), 'warning',
      `Shipment ${s.shipmentId} arrived but has not been received after ${config.alert.cargoArrivedNotReceivedHours}h`,
      { rule: 'cargo_arrived_not_received', inputs: { arrivedAt: s.actualArrival, windowHours: config.alert.cargoArrivedNotReceivedHours } }
    );
  }
};

const checkInventoryInconsistencies = async () => {
  const inconsistent = await InventoryItem.find({
    $expr: { $gt: ['$reservedQuantity', '$onHandQuantity'] },
  });
  for (const item of inconsistent) {
    await upsertAlert(
      'inventory_inconsistency', 'InventoryItem', item._id.toString(), 'critical',
      `${item.name} has reserved (${item.reservedQuantity}) > on-hand (${item.onHandQuantity})`,
      { rule: 'reserved_exceeds_on_hand', inputs: { reserved: item.reservedQuantity, onHand: item.onHandQuantity } }
    );
  }
};

const checkForecastThreshold = async () => {
  const items = await InventoryItem.find({});
  for (const item of items) {
    const forecast = await computeForecast(
      item._id.toString(), item.onHandQuantity, item.reservedQuantity,
      item.minThreshold, item.unit, config.forecast.defaultWindowDays
    );
    if (
      forecast.estimatedDaysRemaining !== null &&
      forecast.estimatedDaysRemaining <= config.alert.forecastDaysThreshold &&
      forecast.confidence !== 'insufficient_data'
    ) {
      await upsertAlert(
        'forecast_threshold', 'InventoryItem', item._id.toString(), 'warning',
        `${item.name} forecast to deplete in ${Math.round(forecast.estimatedDaysRemaining)} days (confidence: ${forecast.confidence})`,
        { rule: 'forecast_days_threshold', inputs: { daysRemaining: forecast.estimatedDaysRemaining, confidence: forecast.confidence, threshold: config.alert.forecastDaysThreshold } }
      );
    }
  }
};

// ── §6.3 Priority Score ───────────────────────────────────────────────────
export const computePriorityScore = (
  criticality: number, // 0-10
  daysUntilRequired: number,
  isDelayed: boolean,
  resourceScarcity: number // 0-10
): { score: number; components: Record<string, number> } => {
  const w1 = 0.35, w2 = 0.30, w3 = 0.20, w4 = 0.15;

  const urgency = Math.max(0, 10 - daysUntilRequired / 3); // 0-10
  const delayScore = isDelayed ? 10 : 0;

  const score = w1 * criticality + w2 * urgency + w3 * delayScore + w4 * resourceScarcity;

  return {
    score: Math.round(score * 10) / 10,
    components: {
      criticality: Math.round(w1 * criticality * 10) / 10,
      urgency: Math.round(w2 * urgency * 10) / 10,
      delayStatus: Math.round(w3 * delayScore * 10) / 10,
      resourceScarcity: Math.round(w4 * resourceScarcity * 10) / 10,
    },
  };
};
