// Simple sequential ID generator backed by counters in-memory during session
// For production, use a dedicated counter collection
const counters: Record<string, number> = {};

export const generateSequentialId = (prefix: string, year: number): string => {
  const key = `${prefix}-${year}`;
  counters[key] = (counters[key] || 0) + 1;
  return `${prefix}-${year}-${String(counters[key]).padStart(4, '0')}`;
};

// Initialize counters from DB (call on startup)
export const initCounters = async (): Promise<void> => {
  // Dynamically import to avoid circular deps
  const { Shipment } = await import('../models/Shipment');
  const { Personnel } = await import('../models/Personnel');
  const { Asset } = await import('../models/Asset');
  const { Incident } = await import('../models/Incident');

  const year = new Date().getFullYear();

  const [lastShipment, lastPersonnel, lastAsset, lastIncident] = await Promise.all([
    Shipment.findOne({ shipmentId: new RegExp(`^SHP-${year}`) }).sort({ shipmentId: -1 }),
    Personnel.findOne({ personnelId: new RegExp(`^PRS-${year}`) }).sort({ personnelId: -1 }),
    Asset.findOne({ assetId: new RegExp(`^AST-${year}`) }).sort({ assetId: -1 }),
    Incident.findOne({ incidentId: new RegExp(`^INC-${year}`) }).sort({ incidentId: -1 }),
  ]);

  const extractNum = (id: string | undefined) => {
    if (!id) return 0;
    const parts = id.split('-');
    return parseInt(parts[parts.length - 1], 10) || 0;
  };

  counters[`SHP-${year}`] = extractNum(lastShipment?.shipmentId);
  counters[`PRS-${year}`] = extractNum(lastPersonnel?.personnelId);
  counters[`AST-${year}`] = extractNum(lastAsset?.assetId);
  counters[`INC-${year}`] = extractNum(lastIncident?.incidentId);
};
