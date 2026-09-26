import { prisma } from '../config/database';
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

  // Get consumption transactions for the window via raw SQL (TiDB-compatible)
  const rows = await prisma.$queryRaw<{ day: string; total: number }[]>`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m-%d') as day,
      SUM(ABS(quantity)) as total
    FROM inventory_transactions
    WHERE item_id = ${itemId}
      AND type = 'consumption'
      AND created_at >= ${windowStart}
    GROUP BY day
    ORDER BY day ASC
  `;

  const historicalData = rows.map((r) => ({ date: r.day, consumption: Number(r.total) }));
  const dailyMap: Record<string, number> = {};
  for (const r of historicalData) dailyMap[r.date] = r.consumption;
  const daysWithData = historicalData.length;

  let confidence: ForecastResult['confidence'];
  if (daysWithData === 0) confidence = 'insufficient_data';
  else if (daysWithData >= windowDays) confidence = 'high';
  else if (daysWithData >= Math.floor(windowDays / 2)) confidence = 'medium';
  else confidence = 'low';

  const totalConsumption = historicalData.reduce((s, r) => s + r.consumption, 0);
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
      inputs: { windowDays, daysWithData, totalConsumption, availableQuantity: available, onHandQuantity: onHand, reservedQuantity: reserved },
    },
  };
};

// ── §6.2 Alert Engine ─────────────────────────────────────────────────────
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
  type: any,
  entityType: string,
  entityId: string,
  severity: any,
  reason: string
) => {
  await prisma.alert.upsert({
    where: { unique_open_alert: { type, entityId, status: 'open' } },
    create: { type, severity, entityType, entityId, reason, status: 'open' },
    update: { lastCheckedAt: new Date(), severity, reason },
  });
};

const checkLowStockAlerts = async () => {
  const lowItems = await prisma.$queryRaw<{ id: string; name: string; on_hand_quantity: number; min_threshold: number; unit: string }[]>`
    SELECT id, name, CAST(on_hand_quantity AS DECIMAL(12,2)) as on_hand_quantity, 
           CAST(min_threshold AS DECIMAL(12,2)) as min_threshold, unit
    FROM inventory_items
    WHERE CAST(on_hand_quantity AS DECIMAL(12,2)) < CAST(min_threshold AS DECIMAL(12,2))
  `;
  for (const item of lowItems) {
    await upsertAlert(
      'low_stock', 'InventoryItem', item.id,
      item.on_hand_quantity === 0 ? 'critical' : 'warning',
      `${item.name} on-hand (${item.on_hand_quantity} ${item.unit}) is below minimum threshold (${item.min_threshold} ${item.unit})`
    );
  }
};

const checkDelayedShipments = async () => {
  const overdue = await prisma.shipment.findMany({
    where: {
      status: { in: ['in_transit'] },
      estimatedArrival: { lt: new Date() },
    },
  });
  for (const s of overdue) {
    await upsertAlert(
      'shipment_delayed', 'Shipment', s.id, 'warning',
      `Shipment ${s.shipmentNumber} is past estimated arrival (${s.estimatedArrival?.toISOString()})`
    );
  }
};

const checkMaintenanceDue = async () => {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Find assets where next_service_due (hour meter target) is close
  // Use lastServiceDate as a proxy for maintenance scheduling
  const assets = await prisma.asset.findMany({
    where: {
      status: 'operational',
      lastServiceDate: { not: null },
    },
  });

  for (const a of assets) {
    if (a.lastServiceDate && a.nextServiceDue) {
      // Flag if hour meter is within 10 hours of next service
      const diff = a.nextServiceDue - a.hourMeter;
      if (diff <= 10) {
        await upsertAlert(
          'maintenance_due', 'Asset', a.id,
          diff <= 0 ? 'critical' : 'warning',
          `${a.name} maintenance due ${diff <= 0 ? 'now (overdue)' : `in ${diff} operating hours`}`
        );
      }
    }
  }
};

const checkCriticalIncidentSLA = async () => {
  const slaMs = config.alert.criticalIncidentSlaMinutes * 60 * 1000;
  const cutoff = new Date(Date.now() - slaMs);
  const criticalUnacked = await prisma.incident.findMany({
    where: {
      severity: 'critical',
      status: 'open',
      reportedAt: { lt: cutoff },
    },
  });
  for (const inc of criticalUnacked) {
    await upsertAlert(
      'critical_incident_unacknowledged', 'Incident', inc.id, 'critical',
      `Critical incident ${inc.incidentNumber} has not been acknowledged within ${config.alert.criticalIncidentSlaMinutes} minutes`
    );
  }
};

const checkCargoArrivedNotReceived = async () => {
  const windowMs = config.alert.cargoArrivedNotReceivedHours * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - windowMs);
  const arrived = await prisma.shipment.findMany({
    where: { status: 'arrived', actualArrival: { lt: cutoff } },
  });
  for (const s of arrived) {
    await upsertAlert(
      'cargo_arrived_not_received', 'Shipment', s.id, 'warning',
      `Shipment ${s.shipmentNumber} arrived but has not been received after ${config.alert.cargoArrivedNotReceivedHours}h`
    );
  }
};

const checkInventoryInconsistencies = async () => {
  const inconsistent = await prisma.$queryRaw<{ id: string; name: string; reserved_quantity: number; on_hand_quantity: number }[]>`
    SELECT id, name, 
           CAST(reserved_quantity AS DECIMAL(12,2)) as reserved_quantity,
           CAST(on_hand_quantity AS DECIMAL(12,2)) as on_hand_quantity
    FROM inventory_items
    WHERE CAST(reserved_quantity AS DECIMAL(12,2)) > CAST(on_hand_quantity AS DECIMAL(12,2))
  `;
  for (const item of inconsistent) {
    await upsertAlert(
      'inventory_inconsistency', 'InventoryItem', item.id, 'critical',
      `${item.name} has reserved (${item.reserved_quantity}) > on-hand (${item.on_hand_quantity})`
    );
  }
};

const checkForecastThreshold = async () => {
  const items = await prisma.inventoryItem.findMany();
  for (const item of items) {
    const forecast = await computeForecast(
      item.id,
      Number(item.onHandQuantity),
      Number(item.reservedQuantity),
      Number(item.minThreshold),
      item.unit,
      config.forecast.defaultWindowDays
    );
    if (
      forecast.estimatedDaysRemaining !== null &&
      forecast.estimatedDaysRemaining <= config.alert.forecastDaysThreshold &&
      forecast.confidence !== 'insufficient_data'
    ) {
      await upsertAlert(
        'forecast_threshold', 'InventoryItem', item.id, 'warning',
        `${item.name} forecast to deplete in ${Math.round(forecast.estimatedDaysRemaining)} days (confidence: ${forecast.confidence})`
      );
    }
  }
};

// ── §6.3 Priority Score ───────────────────────────────────────────────────
export const computePriorityScore = (
  criticality: number,
  daysUntilRequired: number,
  isDelayed: boolean,
  resourceScarcity: number
): { score: number; components: Record<string, number> } => {
  const w1 = 0.35, w2 = 0.30, w3 = 0.20, w4 = 0.15;
  const urgency = Math.max(0, 10 - daysUntilRequired / 3);
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
