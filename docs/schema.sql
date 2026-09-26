-- ========================================================================
-- POLARIS Database Schema for TiDB / MySQL
-- ========================================================================

CREATE DATABASE IF NOT EXISTS polaris;
USE polaris;

-- 1. Stations
CREATE TABLE IF NOT EXISTS stations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  location VARCHAR(255) NOT NULL,
  lat DECIMAL(10, 6) NOT NULL,
  lon DECIMAL(10, 6) NOT NULL,
  status ENUM('active', 'winter-over', 'decommissioned') DEFAULT 'active',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'expedition_coordinator', 'logistics_officer', 'inventory_manager', 'personnel_coordinator', 'emergency_coordinator', 'station_ops') NOT NULL,
  station_id VARCHAR(36),
  is_active BOOLEAN DEFAULT TRUE,
  refresh_token_version INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL
);

-- 3. Expeditions
CREATE TABLE IF NOT EXISTS expeditions (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mission_type ENUM('scientific', 'resupply', 'maintenance', 'emergency', 'survey') NOT NULL,
  destination_id VARCHAR(36) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status ENUM('draft', 'planned', 'active', 'completed', 'cancelled') DEFAULT 'draft',
  planning_progress INT DEFAULT 0,
  description TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (destination_id) REFERENCES stations(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  category ENUM('fuel', 'rations', 'medical', 'spare_parts', 'scientific_equipment', 'safety_gear') NOT NULL,
  unit VARCHAR(50) NOT NULL,
  on_hand_quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
  min_threshold DECIMAL(12, 2) NOT NULL DEFAULT 0,
  target_stock DECIMAL(12, 2) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  storage_location VARCHAR(255),
  supplier VARCHAR(255),
  station_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

-- 5. Inventory Transactions (Ledger)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id VARCHAR(36) PRIMARY KEY,
  item_id VARCHAR(36) NOT NULL,
  station_id VARCHAR(36) NOT NULL,
  type ENUM('inbound', 'outbound', 'consumption', 'adjustment', 'loss') NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  notes TEXT,
  performed_by VARCHAR(36),
  client_mutation_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id),
  FOREIGN KEY (station_id) REFERENCES stations(id),
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Shipments & Cargo
CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(36) PRIMARY KEY,
  shipment_number VARCHAR(50) NOT NULL UNIQUE,
  origin VARCHAR(255) NOT NULL,
  destination_id VARCHAR(36) NOT NULL,
  expedition_id VARCHAR(36),
  status ENUM('manifest_created', 'in_transit', 'arrived', 'received', 'delayed', 'cancelled') DEFAULT 'manifest_created',
  departure_date TIMESTAMP,
  estimated_arrival TIMESTAMP,
  actual_arrival TIMESTAMP,
  tracking_number VARCHAR(100),
  vessel_name VARCHAR(255),
  notes TEXT,
  client_mutation_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (destination_id) REFERENCES stations(id),
  FOREIGN KEY (expedition_id) REFERENCES expeditions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cargo_items (
  id VARCHAR(36) PRIMARY KEY,
  shipment_id VARCHAR(36) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  weight_kg DECIMAL(10, 2),
  volume_m3 DECIMAL(10, 2),
  hazardous BOOLEAN DEFAULT FALSE,
  received BOOLEAN DEFAULT FALSE,
  condition_notes TEXT,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- 7. Personnel
CREATE TABLE IF NOT EXISTS personnel (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  medical_clearance_date DATE,
  clearance_status ENUM('valid', 'expiring_soon', 'expired', 'failed') DEFAULT 'valid',
  blood_group VARCHAR(10),
  emergency_contact VARCHAR(255),
  station_id VARCHAR(36) NOT NULL,
  current_status ENUM('at_station', 'on_assignment', 'in_transit', 'evacuated') DEFAULT 'at_station',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

-- 8. Assets & Maintenance
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(36) PRIMARY KEY,
  asset_tag VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category ENUM('heavy_machinery', 'generator', 'life_support', 'vehicle', 'scientific_instrument', 'communication') NOT NULL,
  status ENUM('operational', 'maintenance_due', 'under_repair', 'decommissioned') DEFAULT 'operational',
  station_id VARCHAR(36) NOT NULL,
  hour_meter INT DEFAULT 0,
  next_service_due INT DEFAULT 250,
  last_service_date TIMESTAMP,
  critical_rating ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id VARCHAR(36) PRIMARY KEY,
  asset_id VARCHAR(36) NOT NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  service_type ENUM('routine', 'repair', 'emergency', 'inspection') NOT NULL,
  hours_at_service INT NOT NULL,
  performed_by VARCHAR(36),
  notes TEXT,
  cost DECIMAL(10, 2) DEFAULT 0,
  next_service_due INT,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Incidents & Emergency Response
CREATE TABLE IF NOT EXISTS incidents (
  id VARCHAR(36) PRIMARY KEY,
  incident_number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  severity ENUM('minor', 'moderate', 'severe', 'critical') NOT NULL,
  category ENUM('medical', 'weather_damage', 'equipment_failure', 'crevasse_fall', 'whiteout_disorientation', 'power_loss', 'fuel_spill') NOT NULL,
  status ENUM('open', 'investigating', 'mitigated', 'resolved', 'closed') DEFAULT 'open',
  station_id VARCHAR(36) NOT NULL,
  expedition_id VARCHAR(36),
  location_description TEXT,
  reported_by VARCHAR(36),
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by VARCHAR(36),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(36),
  resolution_notes TEXT,
  client_mutation_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES stations(id),
  FOREIGN KEY (expedition_id) REFERENCES expeditions(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Alerts & Deduplication
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(36) PRIMARY KEY,
  type ENUM('low_stock', 'shipment_delayed', 'forecast_threshold', 'maintenance_due', 'critical_incident_unacknowledged', 'cargo_arrived_not_received', 'inventory_inconsistency') NOT NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('open', 'acknowledged', 'resolved') DEFAULT 'open',
  last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_open_alert (type, entity_id, status)
);

-- 11. Audit Logs (Immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  performed_by VARCHAR(36),
  before_json JSON,
  after_json JSON,
  client_mutation_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ========================================================================
-- Seed Initial Stations & Vasantha Vishwa Admin Account
-- ========================================================================

INSERT INTO stations (id, name, code, location, lat, lon, status, timezone) VALUES
  ('stat-maitri', 'Maitri Station', 'MAIT', 'Queen Maud Land, Antarctica', -70.770000, 11.730000, 'active', 'UTC+5:30'),
  ('stat-dakshin', 'Dakshin Gangotri', 'DAK', 'Princess Astrid Coast, Antarctica', -70.080000, 12.000000, 'winter-over', 'UTC'),
  ('stat-bharati', 'Bharati Station', 'BHAR', 'Larsemann Hills, East Antarctica', -69.410000, 76.180000, 'active', 'UTC+5')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Default password is 'Polaris@2026' (bcrypt hash)
INSERT INTO users (id, name, email, password, role, station_id, is_active) VALUES
  ('usr-admin-vasantha', 'Vasantha Vishwa', 'vasanthavishwa@polaris.com', '$2a$10$xmjufvMHtHa4EP8vRqvhh.HazpLn.mTVkzy1JA8D9SntCk/jiGRU6', 'admin', 'stat-maitri', TRUE),
  ('usr-coord-arjun', 'Capt. Arjun Mehta', 'coordinator@polaris.com', '$2a$10$xmjufvMHtHa4EP8vRqvhh.HazpLn.mTVkzy1JA8D9SntCk/jiGRU6', 'expedition_coordinator', 'stat-maitri', TRUE),
  ('usr-logistics-priya', 'Lt. Priya Nair', 'logistics@polaris.com', '$2a$10$xmjufvMHtHa4EP8vRqvhh.HazpLn.mTVkzy1JA8D9SntCk/jiGRU6', 'logistics_officer', 'stat-maitri', TRUE),
  ('usr-inv-kavya', 'Dr. Kavya Reddy', 'inventory@polaris.com', '$2a$10$xmjufvMHtHa4EP8vRqvhh.HazpLn.mTVkzy1JA8D9SntCk/jiGRU6', 'inventory_manager', 'stat-dakshin', TRUE),
  ('usr-emerg-anita', 'Dr. Anita Sharma', 'emergency@polaris.com', '$2a$10$xmjufvMHtHa4EP8vRqvhh.HazpLn.mTVkzy1JA8D9SntCk/jiGRU6', 'emergency_coordinator', 'stat-maitri', TRUE),
  ('usr-ops-rajan', 'Tech. Rajan Pillai', 'ops@polaris.com', '$2a$10$xmjufvMHtHa4EP8vRqvhh.HazpLn.mTVkzy1JA8D9SntCk/jiGRU6', 'station_ops', 'stat-maitri', TRUE)
ON DUPLICATE KEY UPDATE email=VALUES(email);
