# POLARIS Architecture Documentation

## 1. System Overview
**POLARIS (Polar Logistics and Resource Intelligence System)** is an integrated logistics, cargo tracking, resource forecasting, and emergency coordination platform designed for Antarctic research stations (Maitri, Bharati, Dakshin Gangotri) operating under harsh polar environmental conditions with intermittent low-bandwidth satellite connectivity.

```
                          ┌──────────────────────────────┐
                          │   Polar Research Stations    │
                          │   (Maitri / Bharati / DAK)   │
                          └──────────────┬───────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
      ┌───────────────────────────┐             ┌───────────────────────────┐
      │   Vite + React Frontend   │             │   Field Tablets / Laptops │
      │   (TailwindCSS + Lucide)  │             │   (Offline Dexie.js DB)   │
      └─────────────┬─────────────┘             └─────────────┬─────────────┘
                    │                                         │
                    │ REST / JWT Auth                         │ Auto-Sync / Reconnect
                    │                                         │
                    ▼                                         ▼
      ┌─────────────────────────────────────────────────────────────────────┐
      │                     POLARIS Backend API                             │
      │                  (Node.js + Express + TypeScript)                   │
      ├──────────────────┬──────────────────┬────────────────┬──────────────┤
      │ RBAC Middleware  │ Audit Logging    │ Idempotency    │ Rate Limiting│
      ├──────────────────┴──────────────────┴────────────────┴──────────────┤
      │ Controllers: Auth, Expeditions, Cargo, Inventory, Personnel, Assets,│
      │              Emergency Incidents, Analytics/Intelligence Engine     │
      └──────────────────────────────────┬──────────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │               MongoDB 7.0               │
                    │ Collections: Users, Stations,           │
                    │ Expeditions, Shipments, Inventory,      │
                    │ Personnel, Assets, Incidents, Alerts    │
                    └─────────────────────────────────────────┘
```

## 2. Core Architectural Pillars

### A. Resilient Offline-First Sync Architecture
Polar stations communicate via intermittent satellite connections (Iridium, Inmarsat, Starlink) prone to weather blackouts and ionospheric storms.
- **Client-Side Storage**: IndexedDB via `Dexie.js` stores local drafts and mutation queues when offline.
- **Idempotency Keys**: All inventory modifications, cargo receipt confirmations, and incident reports submit a `clientMutationId` UUID.
- **Automatic Reconnection**: The frontend monitors online/offline events and flushes pending mutations automatically upon reconnection.

### B. Audit Trail & Computed Inventory Ledger
- **No Direct Quantity Drift**: Inventory balance (`onHandQuantity`) is strictly verified against transactional ledger records (`inbound`, `outbound`, `consumption`, `adjustment`, `loss`).
- **Cryptographic User Attribution**: Every write mutation generates an immutable `AuditLog` entry tracking `performedBy`, `action`, `entityType`, `entityId`, and timestamped state diffs (`before` / `after`).

### C. Predictive Intelligence & Alert Engine
- **Moving Average Depletion**: Calculates 7, 14, and 30-day consumption moving averages to project days-to-stockout ($D_{\text{remaining}} = Q_{\text{available}} / U_{\text{daily}}$).
- **Composite Priority Score**: Expeditions and cargo items are scored based on mission priority, environmental risk windows, critical supply classification, and transport constraints.
- **Rule-Based Alert Engine**: Monitors 7 distinct polar operating conditions with deduplication:
  1. `low_stock`: On-hand quantity falls below station safety threshold.
  2. `shipment_delayed`: Cargo ETA exceeded with vessel in transit.
  3. `forecast_threshold`: Projected depletion before next resupply window.
  4. `maintenance_due`: Heavy snowcats, generators, and life-support assets exceeding service interval.
  5. `critical_incident_unacknowledged`: Station emergency unacknowledged beyond 15-minute SLA.
  6. `cargo_arrived_not_received`: Cargo marked arrived at port without physical receipt reconciliation.
  7. `inventory_inconsistency`: Physical count disparity vs. ledger calculation.

### D. Multi-Role RBAC Security
POLARIS enforces strict least-privilege role-based access control across 7 roles:
- `admin`: Full system administration, user provisioning, station configuration.
- `expedition_coordinator`: Plan, dispatch, manage, and complete field expeditions.
- `logistics_officer`: Cargo manifests, shipments, vessel tracking, container assignments.
- `inventory_manager`: Stock receipts, ledger adjustments, safety threshold management.
- `personnel_officer`: Crew manifests, medical clearance, evacuation routing, deployment tracking.
- `emergency_coordinator`: Priority-1 distress declaration, SOS alerts, response mission dispatch.
- `operations_viewer`: Read-only station telemetry, inventory levels, mission maps.
