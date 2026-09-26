/**
 * POLARIS — Seed Script for TiDB Cloud (Prisma ORM)
 * Run: npm run seed
 * Populates stations, users, expeditions, inventory items, 90-day ledger history,
 * shipments, cargo, personnel, assets, incidents, and alerts.
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { prisma } from './config/database';
import {
  StationStatus,
  UserRole,
  ExpeditionMissionType,
  ExpeditionStatus,
  InventoryCategory,
  TransactionType,
  ShipmentStatus,
  ClearanceStatus,
  PersonnelStatus,
  AssetCategory,
  AssetStatus,
  CriticalRating,
  IncidentSeverity,
  IncidentCategory,
  IncidentStatus,
  AlertType,
  AlertSeverity,
  AlertStatus,
} from '@prisma/client';

const PASSWORD = 'Polaris@2026';

async function seed() {
  console.log('Connecting to TiDB Cloud via Prisma...');

  const hashed = await bcrypt.hash(PASSWORD, 10);

  // ── 1. Stations ────────────────────────────────────────────────────────
  console.log('Seeding Stations...');
  const stationsData = [
    { id: 'stat-maitri', name: 'Maitri Station', code: 'MAIT', location: 'Queen Maud Land, Antarctica', lat: -70.77, lon: 11.73, status: 'active' as StationStatus, timezone: 'UTC+5:30' },
    { id: 'stat-dakshin', name: 'Dakshin Gangotri', code: 'DAK', location: 'Princess Astrid Coast, Antarctica', lat: -70.08, lon: 12.0, status: 'winter_over' as StationStatus, timezone: 'UTC' },
    { id: 'stat-bharati', name: 'Bharati Station', code: 'BHAR', location: 'Larsemann Hills, East Antarctica', lat: -69.41, lon: 76.18, status: 'active' as StationStatus, timezone: 'UTC+5' },
  ];

  for (const s of stationsData) {
    await prisma.station.upsert({
      where: { code: s.code },
      create: s,
      update: s,
    });
  }

  // ── 2. Users ───────────────────────────────────────────────────────────
  console.log('Seeding Users...');
  const usersData = [
    { id: 'usr-admin-vasantha', name: 'Vasantha Vishwa', email: 'vasanthavishwa@polaris.com', password: hashed, role: 'admin' as UserRole, stationId: 'stat-maitri', isActive: true },
    { id: 'usr-coord-arjun', name: 'Capt. Arjun Mehta', email: 'coordinator@polaris.com', password: hashed, role: 'expedition_coordinator' as UserRole, stationId: 'stat-maitri', isActive: true },
    { id: 'usr-logistics-priya', name: 'Lt. Priya Nair', email: 'logistics@polaris.com', password: hashed, role: 'logistics_officer' as UserRole, stationId: 'stat-maitri', isActive: true },
    { id: 'usr-inv-kavya', name: 'Dr. Kavya Reddy', email: 'inventory@polaris.com', password: hashed, role: 'inventory_manager' as UserRole, stationId: 'stat-dakshin', isActive: true },
    { id: 'usr-emerg-anita', name: 'Dr. Anita Sharma', email: 'emergency@polaris.com', password: hashed, role: 'emergency_coordinator' as UserRole, stationId: 'stat-maitri', isActive: true },
    { id: 'usr-ops-rajan', name: 'Tech. Rajan Pillai', email: 'ops@polaris.com', password: hashed, role: 'station_ops' as UserRole, stationId: 'stat-maitri', isActive: true },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: u,
      update: { name: u.name, password: u.password, role: u.role, stationId: u.stationId, isActive: u.isActive },
    });
  }

  // ── 3. Expeditions ─────────────────────────────────────────────────────
  console.log('Seeding Expeditions...');
  const expeditionsData = [
    { id: 'exp-2026-01', name: 'POLAR-2026-01: Geomagnetic Survey', missionType: 'scientific' as ExpeditionMissionType, destinationId: 'stat-maitri', startDate: new Date('2026-10-01'), endDate: new Date('2026-12-15'), status: 'active' as ExpeditionStatus, planningProgress: 85, description: 'Annual geomagnetic field survey around Maitri Station', createdBy: 'usr-admin-vasantha' },
    { id: 'exp-2026-02', name: 'POLAR-2026-02: Winter Resupply', missionType: 'resupply' as ExpeditionMissionType, destinationId: 'stat-dakshin', startDate: new Date('2026-11-10'), endDate: new Date('2026-11-25'), status: 'planned' as ExpeditionStatus, planningProgress: 60, description: 'Critical winter resupply to Dakshin Gangotri', createdBy: 'usr-coord-arjun' },
    { id: 'exp-2026-03', name: 'POLAR-2026-03: Ice Core Drilling', missionType: 'scientific' as ExpeditionMissionType, destinationId: 'stat-bharati', startDate: new Date('2026-12-01'), endDate: new Date('2027-02-28'), status: 'planned' as ExpeditionStatus, planningProgress: 40, description: 'Deep ice core extraction for paleoclimate research', createdBy: 'usr-coord-arjun' },
    { id: 'exp-2025-05', name: 'POLAR-2025-05: Equipment Overhaul', missionType: 'maintenance' as ExpeditionMissionType, destinationId: 'stat-maitri', startDate: new Date('2025-09-01'), endDate: new Date('2025-10-30'), status: 'completed' as ExpeditionStatus, planningProgress: 100, description: 'Annual equipment overhaul completed', createdBy: 'usr-admin-vasantha' },
    { id: 'exp-2025-04', name: 'POLAR-2025-04: Emergency Medical', missionType: 'emergency' as ExpeditionMissionType, destinationId: 'stat-dakshin', startDate: new Date('2025-07-15'), endDate: new Date('2025-07-20'), status: 'completed' as ExpeditionStatus, planningProgress: 100, description: 'Emergency medical evacuation mission', createdBy: 'usr-admin-vasantha' },
  ];

  for (const exp of expeditionsData) {
    await prisma.expedition.upsert({
      where: { id: exp.id },
      create: exp,
      update: exp,
    });
  }

  // ── 4. Inventory Items ─────────────────────────────────────────────────
  console.log('Seeding Inventory Items...');
  const itemsData = [
    { id: 'item-fuel-01', name: 'Diesel (Aviation Grade)', sku: 'SKU-FUEL-001', category: 'fuel' as InventoryCategory, unit: 'liters', onHandQuantity: 8000, reservedQuantity: 1000, minThreshold: 5000, targetStock: 12000, unitCost: 1.85, storageLocation: 'Fuel Bay Alpha', stationId: 'stat-maitri' },
    { id: 'item-fuel-02', name: 'Kerosene', sku: 'SKU-FUEL-002', category: 'fuel' as InventoryCategory, unit: 'liters', onHandQuantity: 800, reservedQuantity: 0, minThreshold: 1000, targetStock: 2500, unitCost: 1.40, storageLocation: 'Tank B', stationId: 'stat-dakshin' },
    { id: 'item-food-01', name: 'Freeze-dried rations (90 day)', sku: 'SKU-FOOD-001', category: 'rations' as InventoryCategory, unit: 'kg', onHandQuantity: 350, reservedQuantity: 50, minThreshold: 400, targetStock: 800, unitCost: 12.50, storageLocation: 'Pantry 1', stationId: 'stat-maitri' },
    { id: 'item-food-02', name: 'Emergency protein bars', sku: 'SKU-FOOD-002', category: 'rations' as InventoryCategory, unit: 'units', onHandQuantity: 1200, reservedQuantity: 0, minThreshold: 500, targetStock: 1500, unitCost: 3.20, storageLocation: 'Emergency Locker A', stationId: 'stat-maitri' },
    { id: 'item-med-01', name: 'First Aid Kit (Level 3)', sku: 'SKU-MED-001', category: 'medical' as InventoryCategory, unit: 'kits', onHandQuantity: 15, reservedQuantity: 0, minThreshold: 10, targetStock: 25, unitCost: 145.00, storageLocation: 'Med Bay Cabinet 2', stationId: 'stat-maitri' },
    { id: 'item-med-02', name: 'Morphine injections', sku: 'SKU-MED-002', category: 'medical' as InventoryCategory, unit: 'vials', onHandQuantity: 30, reservedQuantity: 5, minThreshold: 40, targetStock: 80, unitCost: 22.00, storageLocation: 'Narcotics Safe', stationId: 'stat-dakshin' },
    { id: 'item-spare-01', name: 'Generator spark plugs', sku: 'SKU-SPARE-001', category: 'spare_parts' as InventoryCategory, unit: 'units', onHandQuantity: 12, reservedQuantity: 0, minThreshold: 20, targetStock: 50, unitCost: 15.00, storageLocation: 'Workshop Shelf 3', stationId: 'stat-maitri' },
    { id: 'item-gear-01', name: 'Extreme cold weather suits', sku: 'SKU-GEAR-001', category: 'safety_gear' as InventoryCategory, unit: 'suits', onHandQuantity: 42, reservedQuantity: 10, minThreshold: 30, targetStock: 60, unitCost: 380.00, storageLocation: 'Gear Room', stationId: 'stat-maitri' },
    { id: 'item-sci-01', name: 'Ice core sample containers', sku: 'SKU-SCI-001', category: 'scientific_equipment' as InventoryCategory, unit: 'units', onHandQuantity: 120, reservedQuantity: 20, minThreshold: 80, targetStock: 200, unitCost: 45.00, storageLocation: 'Cold Lab', stationId: 'stat-bharati' },
  ];

  for (const item of itemsData) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      create: item,
      update: item,
    });
  }

  // ── 5. 30-Day Inventory Consumption History (for Analytics/Forecasting) ──
  console.log('Seeding Inventory Transactions...');
  const txCount = await prisma.inventoryTransaction.count();
  if (txCount === 0) {
    const transactions = [];
    for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
      const txDate = new Date();
      txDate.setDate(txDate.getDate() - dayOffset);
      const qty = Math.floor(Math.random() * 8) + 2;

      transactions.push({
        id: `tx-fuel-${dayOffset}`,
        itemId: 'item-fuel-01',
        stationId: 'stat-maitri',
        type: 'consumption' as TransactionType,
        quantity: qty,
        balanceAfter: 8000 - dayOffset * 5,
        referenceType: 'daily_ops',
        notes: `Daily diesel consumption - day -${dayOffset}`,
        performedBy: 'usr-admin-vasantha',
        createdAt: txDate,
      });

      transactions.push({
        id: `tx-rations-${dayOffset}`,
        itemId: 'item-food-01',
        stationId: 'stat-maitri',
        type: 'consumption' as TransactionType,
        quantity: 3,
        balanceAfter: 350 - dayOffset * 2,
        referenceType: 'daily_ops',
        notes: `Ration distribution - day -${dayOffset}`,
        performedBy: 'usr-inv-kavya',
        createdAt: txDate,
      });
    }

    for (const tx of transactions) {
      await prisma.inventoryTransaction.create({ data: tx });
    }
  }

  // ── 6. Shipments & Cargo ───────────────────────────────────────────────
  console.log('Seeding Shipments...');
  const shipmentsData = [
    { id: 'shp-2026-0001', shipmentNumber: 'SHP-2026-0001', origin: 'Cape Town Port, South Africa', destinationId: 'stat-maitri', expeditionId: 'exp-2026-02', status: 'arrived' as ShipmentStatus, departureDate: new Date('2026-08-15'), estimatedArrival: new Date('2026-09-20'), actualArrival: new Date('2026-09-21'), trackingNumber: 'TRK-POLAR-9921', vesselName: 'SA Agulhas II' },
    { id: 'shp-2026-0002', shipmentNumber: 'SHP-2026-0002', origin: 'Maitri Station', destinationId: 'stat-bharati', expeditionId: 'exp-2026-03', status: 'in_transit' as ShipmentStatus, departureDate: new Date('2026-09-10'), estimatedArrival: new Date('2026-10-05'), trackingNumber: 'TRK-POLAR-9922', vesselName: 'Polar Pioneer' },
    { id: 'shp-2026-0003', shipmentNumber: 'SHP-2026-0003', origin: 'Goa Harbor, India', destinationId: 'stat-dakshin', expeditionId: 'exp-2026-02', status: 'delayed' as ShipmentStatus, departureDate: new Date('2026-08-01'), estimatedArrival: new Date('2026-09-15'), trackingNumber: 'TRK-POLAR-9923', vesselName: 'MV Vasiliy Golovnin', notes: 'Severe sea ice pack delayed transit by 14 days' },
  ];

  for (const shp of shipmentsData) {
    const s = await prisma.shipment.upsert({
      where: { shipmentNumber: shp.shipmentNumber },
      create: shp,
      update: shp,
    });

    // Seed Cargo Items
    await prisma.cargoItem.createMany({
      data: [
        { shipmentId: s.id, description: 'Freeze-dried rations pallet', quantity: 500, unit: 'kg', weightKg: 550, hazardous: false, received: s.status === 'arrived' },
        { shipmentId: s.id, description: 'Arctic diesel barrels', quantity: 2000, unit: 'liters', weightKg: 1700, hazardous: true, received: s.status === 'arrived' },
      ],
      skipDuplicates: true,
    });
  }

  // ── 7. Personnel ───────────────────────────────────────────────────────
  console.log('Seeding Personnel...');
  const personnelData = [
    { id: 'prs-001', name: 'Dr. Vikram Solankhi', role: 'Glaciologist', medicalClearanceDate: new Date('2026-06-15'), clearanceStatus: 'valid' as ClearanceStatus, bloodGroup: 'O+', emergencyContact: '+91-9876543210', stationId: 'stat-maitri', currentStatus: 'at_station' as PersonnelStatus },
    { id: 'prs-002', name: 'Eng. Deepa Thomas', role: 'Mechanical Engineer', medicalClearanceDate: new Date('2026-05-10'), clearanceStatus: 'valid' as ClearanceStatus, bloodGroup: 'A+', emergencyContact: '+91-9876543211', stationId: 'stat-maitri', currentStatus: 'at_station' as PersonnelStatus },
    { id: 'prs-003', name: 'Dr. Rahul Krishnan', role: 'Atmospheric Scientist', medicalClearanceDate: new Date('2026-07-01'), clearanceStatus: 'valid' as ClearanceStatus, bloodGroup: 'B+', emergencyContact: '+91-9876543212', stationId: 'stat-bharati', currentStatus: 'on_assignment' as PersonnelStatus },
    { id: 'prs-004', name: 'Tech. Sunita Patel', role: 'Communications Technician', medicalClearanceDate: new Date('2026-08-20'), clearanceStatus: 'valid' as ClearanceStatus, bloodGroup: 'AB+', emergencyContact: '+91-9876543213', stationId: 'stat-dakshin', currentStatus: 'at_station' as PersonnelStatus },
    { id: 'prs-005', name: 'Cdr. Harish Bhatt', role: 'Expedition Leader', medicalClearanceDate: new Date('2026-04-12'), clearanceStatus: 'expiring_soon' as ClearanceStatus, bloodGroup: 'O-', emergencyContact: '+91-9876543214', stationId: 'stat-maitri', currentStatus: 'on_assignment' as PersonnelStatus },
  ];

  for (const p of personnelData) {
    await prisma.personnel.upsert({
      where: { id: p.id },
      create: p,
      update: p,
    });
  }

  // ── 8. Assets & Maintenance ────────────────────────────────────────────
  console.log('Seeding Assets...');
  const assetsData = [
    { id: 'ast-001', assetTag: 'AST-SC-001', name: 'Snow Crawler SC-7', category: 'vehicle' as AssetCategory, status: 'operational' as AssetStatus, stationId: 'stat-maitri', hourMeter: 1240, nextServiceDue: 1500, criticalRating: 'high' as CriticalRating },
    { id: 'ast-002', assetTag: 'AST-GEN-002', name: 'Emergency Generator G-3', category: 'generator' as AssetCategory, status: 'operational' as AssetStatus, stationId: 'stat-maitri', hourMeter: 3400, nextServiceDue: 3500, criticalRating: 'critical' as CriticalRating },
    { id: 'ast-003', assetTag: 'AST-COM-003', name: 'Satellite Comms Array INSAT-P', category: 'communication' as AssetCategory, status: 'under_repair' as AssetStatus, stationId: 'stat-maitri', hourMeter: 4800, nextServiceDue: 4500, criticalRating: 'critical' as CriticalRating },
    { id: 'ast-004', assetTag: 'AST-RIG-004', name: 'Ice Core Drill RIG-2', category: 'scientific_instrument' as AssetCategory, status: 'operational' as AssetStatus, stationId: 'stat-bharati', hourMeter: 320, nextServiceDue: 500, criticalRating: 'medium' as CriticalRating },
  ];

  for (const a of assetsData) {
    await prisma.asset.upsert({
      where: { assetTag: a.assetTag },
      create: a,
      update: a,
    });

    await prisma.maintenanceRecord.create({
      data: {
        assetId: a.id,
        serviceType: 'routine',
        hoursAtService: a.hourMeter - 100,
        performedBy: 'usr-admin-vasantha',
        notes: 'Periodic maintenance inspection complete',
        cost: 350.00,
        nextServiceDue: a.nextServiceDue,
      },
    }).catch(() => {});
  }

  // ── 9. Incidents ───────────────────────────────────────────────────────
  console.log('Seeding Incidents...');
  const incidentsData = [
    {
      id: 'inc-001',
      incidentNumber: 'INC-2026-0001',
      title: 'Satellite comms array INSAT-P signal loss',
      severity: 'critical' as IncidentSeverity,
      category: 'equipment_failure' as IncidentCategory,
      status: 'open' as IncidentStatus,
      stationId: 'stat-maitri',
      expeditionId: 'exp-2026-01',
      locationDescription: 'Maitri Communications Dome',
      reportedBy: 'usr-admin-vasantha',
    },
    {
      id: 'inc-002',
      incidentNumber: 'INC-2026-0002',
      title: 'Severe katabatic wind event (120 km/h)',
      severity: 'moderate' as IncidentSeverity,
      category: 'weather_damage' as IncidentCategory,
      status: 'investigating' as IncidentStatus,
      stationId: 'stat-bharati',
      expeditionId: 'exp-2026-03',
      locationDescription: 'Bharati Station East Ridge',
      reportedBy: 'usr-emerg-anita',
      acknowledgedAt: new Date(),
      acknowledgedBy: 'usr-emerg-anita',
    },
  ];

  for (const inc of incidentsData) {
    await prisma.incident.upsert({
      where: { incidentNumber: inc.incidentNumber },
      create: inc,
      update: inc,
    });
  }

  // ── 10. Alerts ─────────────────────────────────────────────────────────
  console.log('Seeding Alerts...');
  const alertsData = [
    { type: 'low_stock' as AlertType, severity: 'warning' as AlertSeverity, entityType: 'InventoryItem', entityId: 'item-food-01', reason: 'Freeze-dried rations on-hand (350 kg) below minimum threshold (400 kg)', status: 'open' as AlertStatus },
    { type: 'low_stock' as AlertType, severity: 'warning' as AlertSeverity, entityType: 'InventoryItem', entityId: 'item-med-02', reason: 'Morphine injections on-hand (30 vials) below minimum (40 vials)', status: 'open' as AlertStatus },
    { type: 'shipment_delayed' as AlertType, severity: 'warning' as AlertSeverity, entityType: 'Shipment', entityId: 'shp-2026-0003', reason: 'Shipment SHP-2026-0003 is past estimated arrival date', status: 'open' as AlertStatus },
    { type: 'critical_incident_unacknowledged' as AlertType, severity: 'critical' as AlertSeverity, entityType: 'Incident', entityId: 'inc-001', reason: 'Critical incident INC-2026-0001 reported and unacknowledged', status: 'open' as AlertStatus },
    { type: 'maintenance_due' as AlertType, severity: 'critical' as AlertSeverity, entityType: 'Asset', entityId: 'ast-003', reason: 'Satellite Comms Array INSAT-P is overdue for scheduled maintenance', status: 'open' as AlertStatus },
  ];

  for (const alt of alertsData) {
    await prisma.alert.upsert({
      where: { unique_open_alert: { type: alt.type, entityId: alt.entityId, status: alt.status } },
      create: alt,
      update: { lastCheckedAt: new Date() },
    });
  }

  console.log('✅ TiDB Cloud database seeded successfully with complete POLARIS dataset!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
