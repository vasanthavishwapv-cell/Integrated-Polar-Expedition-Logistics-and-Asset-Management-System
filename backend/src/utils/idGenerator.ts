// Simple sequential ID generator — in-memory counters per session
// For TiDB, we initialize from the last existing IDs in the DB at startup
import { prisma } from '../config/database';

const counters: Record<string, number> = {};

export const generateSequentialId = (prefix: string, year: number): string => {
  const key = `${prefix}-${year}`;
  counters[key] = (counters[key] || 0) + 1;
  return `${prefix}-${year}-${String(counters[key]).padStart(4, '0')}`;
};

const extractNum = (id: string | null | undefined): number => {
  if (!id) return 0;
  const parts = id.split('-');
  return parseInt(parts[parts.length - 1], 10) || 0;
};

// Initialize counters from TiDB at startup
export const initCounters = async (): Promise<void> => {
  const year = new Date().getFullYear();
  const yearStr = String(year);

  const [lastShipment, lastIncident] = await Promise.all([
    prisma.shipment.findFirst({
      where: { shipmentNumber: { startsWith: `SHP-${year}` } },
      orderBy: { shipmentNumber: 'desc' },
    }),
    prisma.incident.findFirst({
      where: { incidentNumber: { startsWith: `INC-${year}` } },
      orderBy: { incidentNumber: 'desc' },
    }),
  ]);

  counters[`SHP-${year}`] = extractNum(lastShipment?.shipmentNumber);
  counters[`INC-${year}`] = extractNum(lastIncident?.incidentNumber);
  counters[`AST-${year}`] = 0; // asset tags are unique strings, not sequential in TiDB schema
  counters[`PRS-${year}`] = 0; // personnel IDs are UUIDs in TiDB schema
};
