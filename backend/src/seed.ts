/**
 * POLARIS Seed Script
 * Run: npm run seed
 * Resets DB to a reproducible demo state (targets from §12 of the spec)
 *
 * Demo credentials (one per role):
 *   admin@polaris.dev          / Polaris@2026
 *   coordinator@polaris.dev    / Polaris@2026
 *   logistics@polaris.dev      / Polaris@2026
 *   inventory@polaris.dev      / Polaris@2026
 *   personnel@polaris.dev      / Polaris@2026
 *   emergency@polaris.dev      / Polaris@2026
 *   ops@polaris.dev            / Polaris@2026
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { Station } from './models/Station';
import { Expedition } from './models/Expedition';
import { Shipment } from './models/Shipment';
import { InventoryItem, InventoryTransaction } from './models/Inventory';
import { Personnel } from './models/Personnel';
import { Asset, MaintenanceRecord } from './models/Asset';
import { Incident } from './models/Incident';
import { Alert, AuditLog } from './models/Alert';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/polaris';
const PASSWORD = 'Polaris@2026';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Wipe everything ──────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}), Station.deleteMany({}), Expedition.deleteMany({}),
    Shipment.deleteMany({}), InventoryItem.deleteMany({}), InventoryTransaction.deleteMany({}),
    Personnel.deleteMany({}), Asset.deleteMany({}), MaintenanceRecord.deleteMany({}),
    Incident.deleteMany({}), Alert.deleteMany({}), AuditLog.deleteMany({}),
  ]);
  console.log('Database wiped');

  const hashed = await bcrypt.hash(PASSWORD, 12);

  // ── Stations ─────────────────────────────────────────────────────────
  const stations = await Station.insertMany([
    { name: 'Maitri Station', code: 'MAIT', location: 'Queen Maud Land, Antarctica (Simulated)', coordinates: { lat: -70.77, lon: 11.73 }, status: 'active', timezone: 'UTC+5:30' },
    { name: 'Dakshin Gangotri', code: 'DAK', location: 'Princess Astrid Coast, Antarctica (Simulated)', coordinates: { lat: -70.08, lon: 12.0 }, status: 'winter-over', timezone: 'UTC' },
    { name: 'Bharati Station', code: 'BHAR', location: 'Larsemann Hills, East Antarctica (Simulated)', coordinates: { lat: -69.41, lon: 76.18 }, status: 'active', timezone: 'UTC+5' },
  ]);
  console.log(`Created ${stations.length} stations`);

  // ── Users ─────────────────────────────────────────────────────────────
  const users = await User.insertMany([
    { name: 'Dr. Admin Singh', email: 'admin@polaris.dev', password: hashed, role: 'admin', station: stations[0]._id, isActive: true },
    { name: 'Capt. Arjun Mehta', email: 'coordinator@polaris.dev', password: hashed, role: 'expedition_coordinator', station: stations[0]._id, isActive: true },
    { name: 'Lt. Priya Nair', email: 'logistics@polaris.dev', password: hashed, role: 'logistics_officer', station: stations[0]._id, isActive: true },
    { name: 'Dr. Kavya Reddy', email: 'inventory@polaris.dev', password: hashed, role: 'inventory_manager', station: stations[1]._id, isActive: true },
    { name: 'Maj. Suresh Kumar', email: 'personnel@polaris.dev', password: hashed, role: 'personnel_coordinator', station: stations[2]._id, isActive: true },
    { name: 'Dr. Anita Sharma', email: 'emergency@polaris.dev', password: hashed, role: 'emergency_coordinator', station: stations[0]._id, isActive: true },
    { name: 'Tech. Rajan Pillai', email: 'ops@polaris.dev', password: hashed, role: 'station_ops', station: stations[0]._id, isActive: true },
  ]);
  console.log(`Created ${users.length} users`);
  const [adminUser, coordUser, logisticsUser] = users;

  // ── Expeditions ───────────────────────────────────────────────────────
  const expeditions = await Expedition.insertMany([
    { name: 'POLAR-2026-01: Geomagnetic Survey', missionType: 'scientific', destination: stations[0]._id, startDate: new Date('2026-10-01'), endDate: new Date('2026-12-15'), status: 'active', planningProgress: 85, description: 'Annual geomagnetic field survey around Maitri Station', createdBy: adminUser._id },
    { name: 'POLAR-2026-02: Winter Resupply', missionType: 'resupply', destination: stations[1]._id, startDate: new Date('2026-11-10'), endDate: new Date('2026-11-25'), status: 'planned', planningProgress: 60, description: 'Critical winter resupply to Dakshin Gangotri', createdBy: coordUser._id },
    { name: 'POLAR-2026-03: Ice Core Drilling', missionType: 'scientific', destination: stations[2]._id, startDate: new Date('2026-12-01'), endDate: new Date('2027-02-28'), status: 'planned', planningProgress: 40, description: 'Deep ice core extraction for paleoclimate research', createdBy: coordUser._id },
    { name: 'POLAR-2025-05: Equipment Overhaul', missionType: 'maintenance', destination: stations[0]._id, startDate: new Date('2025-09-01'), endDate: new Date('2025-10-30'), status: 'completed', planningProgress: 100, description: 'Annual equipment overhaul completed', createdBy: adminUser._id },
    { name: 'POLAR-2025-04: Emergency Medical', missionType: 'emergency', destination: stations[1]._id, startDate: new Date('2025-07-15'), endDate: new Date('2025-07-20'), status: 'completed', planningProgress: 100, description: 'Emergency medical evacuation mission', createdBy: adminUser._id },
    { name: 'POLAR-2026-04: Atmospheric Study', missionType: 'scientific', destination: stations[2]._id, startDate: new Date('2027-01-15'), endDate: new Date('2027-03-30'), status: 'draft', planningProgress: 15, description: 'Ozone layer monitoring expedition', createdBy: coordUser._id },
  ]);
  console.log(`Created ${expeditions.length} expeditions`);

  // ── Shipments ─────────────────────────────────────────────────────────
  const now = new Date();
  const d = (days: number) => { const dt = new Date(now); dt.setDate(dt.getDate() + days); return dt; };
  const shipments = await Shipment.insertMany([
    { shipmentId: 'SHP-2026-0001', origin: stations[0]._id, destination: stations[1]._id, linkedExpedition: expeditions[1]._id, estimatedArrival: d(-2), actualArrival: d(-2), status: 'arrived', cargoItems: [{ name: 'Freeze-dried rations (90 day)', category: 'food', quantity: 500, unit: 'kg' }, { name: 'Diesel fuel', category: 'fuel', quantity: 2000, unit: 'liters' }], createdBy: logisticsUser._id },
    { shipmentId: 'SHP-2026-0002', origin: stations[0]._id, destination: stations[2]._id, estimatedArrival: d(5), status: 'in_transit', cargoItems: [{ name: 'Medical supplies kit', category: 'medical', quantity: 50, unit: 'units' }], createdBy: logisticsUser._id },
    { shipmentId: 'SHP-2026-0003', origin: stations[2]._id, destination: stations[0]._id, estimatedArrival: d(-5), status: 'delayed', cargoItems: [{ name: 'Ice core drill bits', category: 'research_equipment', quantity: 20, unit: 'units' }], notes: 'Weather delay at Bharati Station', createdBy: logisticsUser._id },
    { shipmentId: 'SHP-2026-0004', origin: stations[0]._id, destination: stations[1]._id, estimatedArrival: d(-10), actualArrival: d(-10), status: 'received', receivedAt: d(-9), receiveIdempotencyKey: 'demo-idem-0004', cargoItems: [{ name: 'Emergency generator parts', category: 'spare_parts', quantity: 5, unit: 'sets' }], createdBy: adminUser._id },
    { shipmentId: 'SHP-2026-0005', origin: stations[0]._id, destination: stations[0]._id, estimatedArrival: d(10), status: 'prepared', cargoItems: [{ name: 'Protective cold weather gear', category: 'protective_equipment', quantity: 30, unit: 'sets' }, { name: 'VHF radio sets', category: 'communication_supplies', quantity: 10, unit: 'units' }], createdBy: logisticsUser._id },
    { shipmentId: 'SHP-2026-0006', origin: stations[2]._id, destination: stations[0]._id, estimatedArrival: d(-8), status: 'delayed', cargoItems: [{ name: 'Atmospheric sensor array', category: 'research_equipment', quantity: 3, unit: 'units' }], notes: 'Logistics delay at Bharati', createdBy: coordUser._id },
    { shipmentId: 'SHP-2026-0007', origin: stations[0]._id, destination: stations[2]._id, estimatedArrival: d(15), status: 'dispatched', cargoItems: [{ name: 'Food rations (30 day)', category: 'food', quantity: 200, unit: 'kg' }], createdBy: logisticsUser._id },
    { shipmentId: 'SHP-2026-0008', origin: stations[1]._id, destination: stations[0]._id, estimatedArrival: d(3), status: 'in_transit', cargoItems: [{ name: 'Geomagnetic sensors', category: 'research_equipment', quantity: 8, unit: 'units' }], createdBy: coordUser._id },
  ]);
  console.log(`Created ${shipments.length} shipments`);

  // ── Inventory Items ───────────────────────────────────────────────────
  const inventoryItems = await InventoryItem.insertMany([
    // FOOD
    { name: 'Freeze-dried rations', category: 'food', station: stations[0]._id, onHandQuantity: 350, reservedQuantity: 50, unit: 'kg', minThreshold: 400 },
    { name: 'Emergency protein bars', category: 'food', station: stations[0]._id, onHandQuantity: 1200, reservedQuantity: 0, unit: 'units', minThreshold: 500 },
    { name: 'Canned vegetables', category: 'food', station: stations[1]._id, onHandQuantity: 80, reservedQuantity: 10, unit: 'kg', minThreshold: 100 },
    // FUEL
    { name: 'Diesel (Aviation Grade)', category: 'fuel', station: stations[0]._id, onHandQuantity: 8000, reservedQuantity: 1000, unit: 'liters', minThreshold: 5000 },
    { name: 'Kerosene', category: 'fuel', station: stations[1]._id, onHandQuantity: 800, reservedQuantity: 0, unit: 'liters', minThreshold: 1000 },
    { name: 'Propane cylinders', category: 'fuel', station: stations[2]._id, onHandQuantity: 25, reservedQuantity: 5, unit: 'cylinders', minThreshold: 20 },
    // MEDICAL
    { name: 'First Aid Kit (Level 3)', category: 'medical', station: stations[0]._id, onHandQuantity: 15, reservedQuantity: 0, unit: 'kits', minThreshold: 10 },
    { name: 'Antibiotics (broad spectrum)', category: 'medical', station: stations[0]._id, onHandQuantity: 200, reservedQuantity: 0, unit: 'doses', minThreshold: 150 },
    { name: 'Morphine injections', category: 'medical', station: stations[1]._id, onHandQuantity: 30, reservedQuantity: 5, unit: 'vials', minThreshold: 40 }, // BELOW THRESHOLD
    // RESEARCH
    { name: 'Ice core sample containers', category: 'research_equipment', station: stations[2]._id, onHandQuantity: 120, reservedQuantity: 20, unit: 'units', minThreshold: 80 },
    { name: 'Atmospheric sensor filters', category: 'research_equipment', station: stations[2]._id, onHandQuantity: 45, reservedQuantity: 0, unit: 'units', minThreshold: 30 },
    // SPARE PARTS
    { name: 'Generator spark plugs', category: 'spare_parts', station: stations[0]._id, onHandQuantity: 12, reservedQuantity: 0, unit: 'units', minThreshold: 20 }, // BELOW THRESHOLD
    { name: 'Snow vehicle tracks', category: 'spare_parts', station: stations[0]._id, onHandQuantity: 4, reservedQuantity: 2, unit: 'pairs', minThreshold: 4 }, // AT THRESHOLD
    // PROTECTIVE
    { name: 'Extreme cold weather suits', category: 'protective_equipment', station: stations[0]._id, onHandQuantity: 42, reservedQuantity: 10, unit: 'suits', minThreshold: 30 },
    { name: 'Thermal gloves (arctic grade)', category: 'protective_equipment', station: stations[1]._id, onHandQuantity: 60, reservedQuantity: 0, unit: 'pairs', minThreshold: 40 },
    // COMMS
    { name: 'VHF Radio sets', category: 'communication_supplies', station: stations[0]._id, onHandQuantity: 18, reservedQuantity: 2, unit: 'units', minThreshold: 15 },
    { name: 'Satellite phone batteries', category: 'communication_supplies', station: stations[1]._id, onHandQuantity: 8, reservedQuantity: 0, unit: 'units', minThreshold: 12 }, // BELOW THRESHOLD
    // OTHER
    { name: 'Scientific data storage drives', category: 'other', station: stations[2]._id, onHandQuantity: 30, reservedQuantity: 0, unit: 'units', minThreshold: 20 },
  ]);
  console.log(`Created ${inventoryItems.length} inventory items`);

  // ── 90-day backdated consumption transactions (for forecasting) ───────
  const topItems = inventoryItems.slice(0, 5); // first 5 items get 90-day history
  const txRecords = [];
  for (const item of topItems) {
    for (let dayOffset = 90; dayOffset >= 1; dayOffset--) {
      const txDate = new Date();
      txDate.setDate(txDate.getDate() - dayOffset);
      // Random daily consumption: 1-5 units
      const qty = Math.floor(Math.random() * 5) + 1;
      txRecords.push({
        item: item._id,
        type: 'consumption',
        quantity: -qty,
        reason: 'Daily station operations',
        performedBy: adminUser._id,
        createdAt: txDate,
      });
    }
  }
  await InventoryTransaction.insertMany(txRecords);
  console.log(`Created ${txRecords.length} inventory transactions (90-day history for top 5 items)`);

  // ── Personnel ─────────────────────────────────────────────────────────
  const personnel = await Personnel.insertMany([
    { personnelId: 'PRS-2026-0001', name: 'Dr. Vikram Solankhi', role: 'Glaciologist', department: 'Scientific', email: 'v.solankhi@ncpor.example', assignedStation: stations[0]._id, linkedExpedition: expeditions[0]._id, currentStatus: 'on_assignment', isActive: true },
    { personnelId: 'PRS-2026-0002', name: 'Eng. Deepa Thomas', role: 'Mechanical Engineer', department: 'Technical', email: 'd.thomas@ncpor.example', assignedStation: stations[0]._id, currentStatus: 'at_station', isActive: true },
    { personnelId: 'PRS-2026-0003', name: 'Dr. Rahul Krishnan', role: 'Atmospheric Scientist', department: 'Scientific', email: 'r.krishnan@ncpor.example', assignedStation: stations[2]._id, linkedExpedition: expeditions[2]._id, currentStatus: 'preparing', isActive: true },
    { personnelId: 'PRS-2026-0004', name: 'Tech. Sunita Patel', role: 'Communication Technician', department: 'Operations', email: 's.patel@ncpor.example', assignedStation: stations[1]._id, currentStatus: 'at_station', isActive: true },
    { personnelId: 'PRS-2026-0005', name: 'Cdr. Harish Bhatt', role: 'Expedition Leader', department: 'Command', email: 'h.bhatt@ncpor.example', assignedStation: stations[0]._id, linkedExpedition: expeditions[0]._id, currentStatus: 'on_assignment', isActive: true },
    { personnelId: 'PRS-2026-0006', name: 'Dr. Maya Iyer', role: 'Medical Officer', department: 'Medical', email: 'm.iyer@ncpor.example', assignedStation: stations[0]._id, currentStatus: 'at_station', isActive: true },
    { personnelId: 'PRS-2026-0007', name: 'Tech. Anil Joshi', role: 'Snow Vehicle Operator', department: 'Logistics', email: 'a.joshi@ncpor.example', assignedStation: stations[2]._id, currentStatus: 'in_transit', isActive: true },
    { personnelId: 'PRS-2026-0008', name: 'Dr. Preethi Rao', role: 'Oceanographer', department: 'Scientific', email: 'p.rao@ncpor.example', assignedStation: stations[2]._id, linkedExpedition: expeditions[2]._id, currentStatus: 'assigned', isActive: true },
    { personnelId: 'PRS-2026-0009', name: 'Eng. Sanjay Dubey', role: 'Power Systems Engineer', department: 'Technical', email: 's.dubey@ncpor.example', assignedStation: stations[1]._id, currentStatus: 'at_station', isActive: true },
    { personnelId: 'PRS-2026-0010', name: 'Lt. Aruna Pillai', role: 'Safety Officer', department: 'Operations', email: 'a.pillai@ncpor.example', assignedStation: stations[0]._id, currentStatus: 'at_station', isActive: true },
    { personnelId: 'PRS-2026-0011', name: 'Dr. Nikhil Saxena', role: 'Geologist', department: 'Scientific', email: 'n.saxena@ncpor.example', assignedStation: stations[0]._id, linkedExpedition: expeditions[0]._id, currentStatus: 'on_assignment', isActive: true },
    { personnelId: 'PRS-2026-0012', name: 'Tech. Fatima Sheikh', role: 'IT Systems Technician', department: 'Technical', email: 'f.sheikh@ncpor.example', assignedStation: stations[2]._id, currentStatus: 'returned', isActive: true },
    { personnelId: 'PRS-2026-0013', name: 'Dr. Kiran Desai', role: 'Marine Biologist', department: 'Scientific', email: 'k.desai@ncpor.example', assignedStation: stations[0]._id, currentStatus: 'status_verification_required', isActive: true },
    { personnelId: 'PRS-2026-0014', name: 'Cdr. Varun Menon', role: 'Navigation Officer', department: 'Operations', email: 'v.menon@ncpor.example', assignedStation: stations[1]._id, linkedExpedition: expeditions[1]._id, currentStatus: 'preparing', isActive: true },
    { personnelId: 'PRS-2026-0015', name: 'Tech. Sneha Kulkarni', role: 'Meteorologist', department: 'Scientific', email: 's.kulkarni@ncpor.example', assignedStation: stations[0]._id, currentStatus: 'at_station', isActive: true },
  ]);
  console.log(`Created ${personnel.length} personnel`);

  // ── Assets ────────────────────────────────────────────────────────────
  const pastMaint = new Date(); pastMaint.setDate(pastMaint.getDate() - 30);
  const nextMaint7 = new Date(); nextMaint7.setDate(nextMaint7.getDate() + 7);
  const nextMaint30 = new Date(); nextMaint30.setDate(nextMaint30.getDate() + 30);
  const nextMaintOverdue = new Date(); nextMaintOverdue.setDate(nextMaintOverdue.getDate() - 3);

  const assets = await Asset.insertMany([
    { assetId: 'AST-2026-0001', name: 'Snow Crawler SC-7', category: 'Vehicle', assignedStation: stations[0]._id, condition: 'good', status: 'operational', acquisitionDate: new Date('2022-01-15'), maintenanceIntervalDays: 90, lastMaintenanceDate: pastMaint, nextMaintenanceDue: nextMaint7, usageHours: 1240, usageHoursThreshold: 1500 },
    { assetId: 'AST-2026-0002', name: 'Emergency Generator G-3', category: 'Power System', assignedStation: stations[0]._id, condition: 'good', status: 'operational', acquisitionDate: new Date('2021-06-01'), maintenanceIntervalDays: 60, lastMaintenanceDate: pastMaint, nextMaintenanceDue: nextMaint30, usageHours: 3400, usageHoursThreshold: 5000 },
    { assetId: 'AST-2026-0003', name: 'Satellite Comms Array INSAT-P', category: 'Communication', assignedStation: stations[0]._id, condition: 'fair', status: 'fault_reported', acquisitionDate: new Date('2020-03-20'), maintenanceIntervalDays: 180, lastMaintenanceDate: new Date('2026-03-20'), nextMaintenanceDue: new Date('2026-09-20'), usageHours: 0, usageHoursThreshold: 9999, notes: 'Signal intermittency reported on 2026-09-15' },
    { assetId: 'AST-2026-0004', name: 'Ice Core Drill RIG-2', category: 'Scientific Equipment', assignedStation: stations[2]._id, condition: 'excellent', status: 'operational', acquisitionDate: new Date('2023-08-10'), maintenanceIntervalDays: 120, lastMaintenanceDate: new Date('2026-06-01'), nextMaintenanceDue: new Date('2026-10-01'), usageHours: 320, usageHoursThreshold: 1000 },
    { assetId: 'AST-2026-0005', name: 'Zodiac Inflatable Boat Z-4', category: 'Marine Vessel', assignedStation: stations[2]._id, condition: 'good', status: 'under_maintenance', acquisitionDate: new Date('2024-02-14'), maintenanceIntervalDays: 365, lastMaintenanceDate: new Date('2025-02-14'), nextMaintenanceDue: new Date('2026-02-14'), usageHours: 80, usageHoursThreshold: 500 },
    { assetId: 'AST-2026-0006', name: 'Weather Station AWS-12', category: 'Scientific Equipment', assignedStation: stations[1]._id, condition: 'good', status: 'operational', acquisitionDate: new Date('2022-11-01'), maintenanceIntervalDays: 180, lastMaintenanceDate: new Date('2026-03-01'), nextMaintenanceDue: nextMaint30, usageHours: 0, usageHoursThreshold: 9999 },
    { assetId: 'AST-2026-0007', name: 'Solar Panel Array SP-6', category: 'Power System', assignedStation: stations[1]._id, condition: 'fair', status: 'fault_reported', acquisitionDate: new Date('2021-01-01'), maintenanceIntervalDays: 365, lastMaintenanceDate: new Date('2025-01-01'), nextMaintenanceDue: nextMaintOverdue, usageHours: 0, usageHoursThreshold: 9999, notes: 'Panel efficiency drop reported' },
    { assetId: 'AST-2026-0008', name: 'Field Medical Unit FMU-2', category: 'Medical Equipment', assignedStation: stations[0]._id, condition: 'excellent', status: 'operational', acquisitionDate: new Date('2024-05-01'), maintenanceIntervalDays: 180, lastMaintenanceDate: new Date('2026-03-01'), nextMaintenanceDue: new Date('2026-09-01'), usageHours: 0, usageHoursThreshold: 9999 },
    { assetId: 'AST-2026-0009', name: 'Snow Groomer SG-3', category: 'Vehicle', assignedStation: stations[0]._id, condition: 'good', status: 'operational', acquisitionDate: new Date('2023-07-01'), maintenanceIntervalDays: 90, lastMaintenanceDate: new Date('2026-07-01'), nextMaintenanceDue: new Date('2026-10-01'), usageHours: 890, usageHoursThreshold: 2000 },
    { assetId: 'AST-2026-0010', name: 'Atmospheric LIDAR Unit', category: 'Scientific Equipment', assignedStation: stations[2]._id, condition: 'good', status: 'operational', acquisitionDate: new Date('2025-01-01'), maintenanceIntervalDays: 365, lastMaintenanceDate: new Date('2026-01-01'), nextMaintenanceDue: new Date('2027-01-01'), usageHours: 0, usageHoursThreshold: 9999 },
    { assetId: 'AST-2026-0011', name: 'Emergency Inflatable Shelter S-2', category: 'Safety Equipment', assignedStation: stations[0]._id, condition: 'excellent', status: 'operational', acquisitionDate: new Date('2025-03-01'), maintenanceIntervalDays: 365, lastMaintenanceDate: new Date('2026-03-01'), nextMaintenanceDue: new Date('2027-03-01'), usageHours: 0, usageHoursThreshold: 9999 },
    { assetId: 'AST-2026-0012', name: 'Ice Penetrating Radar IPR-1', category: 'Scientific Equipment', assignedStation: stations[2]._id, condition: 'poor', status: 'out_of_service', acquisitionDate: new Date('2019-06-01'), maintenanceIntervalDays: 180, lastMaintenanceDate: new Date('2025-06-01'), nextMaintenanceDue: new Date('2025-12-01'), usageHours: 2400, usageHoursThreshold: 2000, notes: 'Sent for depot repair' },
  ]);
  console.log(`Created ${assets.length} assets`);

  // ── Incidents ─────────────────────────────────────────────────────────
  const incidents = await Incident.insertMany([
    {
      incidentId: 'INC-2026-0001',
      type: 'equipment_failure',
      description: 'Satellite comms array INSAT-P experiencing intermittent signal loss. Primary data uplink affected. Backup VHF operational.',
      location: 'Maitri Station - Communications Hub',
      station: stations[0]._id,
      reportedTime: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago = past SLA
      severity: 'critical',
      status: 'reported', // Unacknowledged critical → triggers SLA alert
      requiredResources: ['Satellite uplink technician', 'Replacement LNB module'],
      reportedBy: adminUser._id,
    },
    {
      incidentId: 'INC-2026-0002',
      type: 'weather',
      description: 'Severe katabatic wind event (120 km/h) affecting outdoor operations at Bharati Station. All personnel recalled to shelter.',
      location: 'Bharati Station - Exterior',
      station: stations[2]._id,
      reportedTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      severity: 'high',
      status: 'response_in_progress',
      assignedCoordinator: users[5]._id,
      responseActions: [{ action: 'All personnel recalled to main building', performedBy: 'Dr. Anita Sharma', timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000) }],
      reportedBy: users[5]._id,
    },
    {
      incidentId: 'INC-2026-0003',
      type: 'supply_shortage',
      description: 'Medical supply shortage: morphine vials below minimum threshold. Resupply shipment delayed.',
      location: 'Dakshin Gangotri Medical Bay',
      station: stations[1]._id,
      reportedTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      severity: 'high',
      status: 'acknowledged',
      assignedCoordinator: users[5]._id,
      reportedBy: users[3]._id,
    },
    {
      incidentId: 'INC-2026-0004',
      type: 'medical',
      description: 'Team member reported frostbite on extremities during survey. Treated on-site. Condition stable.',
      location: 'Field Survey Point 7, 12km NE of Maitri',
      station: stations[0]._id,
      reportedTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      severity: 'medium',
      status: 'resolved',
      resolutionNotes: 'Personnel treated and returned to station. Cleared for duty in 48h.',
      reportedBy: users[1]._id,
    },
    {
      incidentId: 'INC-2026-0005',
      type: 'navigation',
      description: 'Snow vehicle SC-7 got stuck in soft snow field during routine traverse. Recovery team dispatched.',
      location: '8km SSW of Maitri Station',
      station: stations[0]._id,
      reportedTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      severity: 'medium',
      status: 'assessing',
      assignedCoordinator: users[5]._id,
      reportedBy: users[6]._id,
    },
    {
      incidentId: 'INC-2026-0006',
      type: 'communication_loss',
      description: 'Periodic communication blackout with Dakshin Gangotri during peak polar night.',
      location: 'Dakshin Gangotri',
      station: stations[1]._id,
      reportedTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
      severity: 'low',
      status: 'closed',
      resolutionNotes: 'Standard polar night interference. HF radio backup functional.',
      reportedBy: users[3]._id,
    },
    {
      incidentId: 'INC-2026-0007',
      type: 'equipment_failure',
      description: 'Solar panel array SP-6 at Dakshin Gangotri showing 35% efficiency drop. Heating element failure suspected.',
      location: 'Dakshin Gangotri - Solar Field',
      station: stations[1]._id,
      reportedTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
      severity: 'high',
      status: 'response_in_progress',
      assignedCoordinator: users[5]._id,
      reportedBy: users[3]._id,
    },
    {
      incidentId: 'INC-2026-0008',
      type: 'security',
      description: 'Unauthorized proximity of research vessel to restricted environmental zone near Bharati Station.',
      location: 'Offshore, 5km W of Bharati Station',
      station: stations[2]._id,
      reportedTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
      severity: 'low',
      status: 'resolved',
      resolutionNotes: 'Vessel identified and warned via radio. Departed the restricted zone.',
      reportedBy: users[4]._id,
    },
  ]);
  console.log(`Created ${incidents.length} incidents`);

  // ── Alerts (seed initial set) ─────────────────────────────────────────
  await Alert.insertMany([
    // Low stock alerts (from below-threshold items)
    { type: 'low_stock', severity: 'warning', entityType: 'InventoryItem', entityId: inventoryItems[0]._id, reason: 'Freeze-dried rations on-hand (350 kg) below minimum (400 kg)', explanation: { rule: 'inventory_below_threshold', inputs: { onHand: 350, threshold: 400 } }, status: 'open', lastCheckedAt: now },
    { type: 'low_stock', severity: 'warning', entityType: 'InventoryItem', entityId: inventoryItems[8]._id, reason: 'Morphine injections on-hand (30 vials) below minimum (40 vials)', explanation: { rule: 'inventory_below_threshold', inputs: { onHand: 30, threshold: 40 } }, status: 'open', lastCheckedAt: now },
    { type: 'low_stock', severity: 'warning', entityType: 'InventoryItem', entityId: inventoryItems[11]._id, reason: 'Generator spark plugs on-hand (12 units) below minimum (20 units)', explanation: { rule: 'inventory_below_threshold', inputs: { onHand: 12, threshold: 20 } }, status: 'open', lastCheckedAt: now },
    { type: 'low_stock', severity: 'warning', entityType: 'InventoryItem', entityId: inventoryItems[16]._id, reason: 'Satellite phone batteries on-hand (8 units) below minimum (12 units)', explanation: { rule: 'inventory_below_threshold', inputs: { onHand: 8, threshold: 12 } }, status: 'open', lastCheckedAt: now },
    // Delayed shipments
    { type: 'shipment_delayed', severity: 'warning', entityType: 'Shipment', entityId: shipments[2]._id, reason: 'Shipment SHP-2026-0003 is past estimated arrival', explanation: { rule: 'shipment_past_eta', inputs: { eta: d(-5), status: 'delayed' } }, status: 'open', lastCheckedAt: now },
    { type: 'shipment_delayed', severity: 'warning', entityType: 'Shipment', entityId: shipments[5]._id, reason: 'Shipment SHP-2026-0006 is past estimated arrival', explanation: { rule: 'shipment_past_eta', inputs: { eta: d(-8), status: 'delayed' } }, status: 'open', lastCheckedAt: now },
    // Maintenance due
    { type: 'maintenance_due', severity: 'warning', entityType: 'Asset', entityId: assets[0]._id, reason: 'Snow Crawler SC-7 maintenance due in 7 days', explanation: { rule: 'maintenance_date_threshold', inputs: { nextDue: nextMaint7, daysUntil: 7 } }, status: 'open', lastCheckedAt: now },
    { type: 'maintenance_due', severity: 'critical', entityType: 'Asset', entityId: assets[6]._id, reason: 'Solar Panel Array SP-6 maintenance overdue', explanation: { rule: 'maintenance_date_threshold', inputs: { nextDue: nextMaintOverdue, daysUntil: -3 } }, status: 'open', lastCheckedAt: now },
    // Critical incident unacknowledged
    { type: 'critical_incident_unacknowledged', severity: 'critical', entityType: 'Incident', entityId: incidents[0]._id, reason: 'Critical incident INC-2026-0001 has not been acknowledged within 15 minutes', explanation: { rule: 'critical_incident_sla', inputs: { slaMinutes: 15, reportedTime: incidents[0].reportedTime } }, status: 'open', lastCheckedAt: now },
    // Cargo arrived but not received (SHP-2026-0001 arrived 2 days ago, not received)
    { type: 'cargo_arrived_not_received', severity: 'warning', entityType: 'Shipment', entityId: shipments[0]._id, reason: 'Shipment SHP-2026-0001 arrived but has not been received after 24h', explanation: { rule: 'cargo_arrived_not_received', inputs: { arrivedAt: d(-2), windowHours: 24 } }, status: 'open', lastCheckedAt: now },
  ]);
  console.log('Created seed alerts');

  console.log('\n✅ POLARIS database seeded successfully!');
  console.log('\nDemo credentials (all passwords: Polaris@2026):');
  console.log('  admin@polaris.dev          → System Administrator');
  console.log('  coordinator@polaris.dev    → Expedition Coordinator');
  console.log('  logistics@polaris.dev      → Logistics Officer');
  console.log('  inventory@polaris.dev      → Inventory Manager');
  console.log('  personnel@polaris.dev      → Personnel Coordinator');
  console.log('  emergency@polaris.dev      → Emergency Coordinator');
  console.log('  ops@polaris.dev            → Station Operations User');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
