# POLARIS: Polar Logistics and Resource Intelligence System
### Smart India Hackathon — Problem Statement SIH26062

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen.svg)](https://www.mongodb.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> **POLARIS** is an integrated polar expedition logistics, asset tracking, inventory depletion forecasting, and emergency coordination platform designed for Antarctic research stations (**Maitri**, **Bharati**, and **Dakshin Gangotri**). It replaces fragmented paper manifests, radio logs, and isolated spreadsheets with an offline-resilient, role-governed digital command center.

---

## ❄️ 1. Problem Statement & Motivation (SIH26062)

Operating scientific research bases in the polar regions presents unprecedented logistical hurdles:
1. **Hostile Climate & Isolation**: Sub-zero blizzards (-40°C to -89°C) freeze supply chains and limit resupply to brief summer shipping windows.
2. **Intermittent Satellite Links**: High-latency, low-bandwidth satellite links suffer frequent atmospheric blackout windows.
3. **Fragmented Data**: Fuel consumption, critical medical supplies, tracked snowcat maintenance, and expedition field movements historically tracked via isolated spreadsheets and handwritten radio logs.
4. **Life-or-Death Inventory Depletion**: Running out of Arctic-grade diesel (A-1) or oxygen in winter-over isolation is catastrophic without automated burn-rate intelligence.

POLARIS solves these challenges with an offline-first architecture, an algorithmic resource forecasting engine, automated anomaly detection, and a role-governed mission command center.

---

## 🏗️ 2. System Architecture & Tech Stack

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
                    └─────────────────────────────────────────┘
```

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Lucide React, Recharts, Zustand, Dexie.js (IndexedDB).
- **Backend**: Node.js, Express, TypeScript, Mongoose, Zod, JWT, Pino logger, Helmet, CORS.
- **Database**: MongoDB 7.0 with ACID transactions for stock reconciliation.
- **Containerization**: Docker & Docker Compose with multi-stage builds and Nginx reverse proxy.

---

## 🚀 3. Key Capabilities

### 🛰️ Expedition Management
- Plan, schedule, track, and dispatch traverse missions and field research expeditions.
- State-machine progression: `draft` ➔ `planned` ➔ `active` ➔ `completed` / `aborted`.
- Waypoint mapping, scientific objective logging, and assigned vehicle/personnel rosters.

### 📦 Cargo Tracking & Physical Receipt Reconcile
- Complete supply chain visibility from port of departure (Goa/Cape Town) to polar ice edge.
- Automated reconciliation: receiving incoming cargo automatically increments station inventory and updates audit ledgers with zero manual re-entry.

### 🛢️ Inventory Ledger & Depletion Forecasting
- **Computed Ledger Principle**: On-hand stock is strictly derived from verified transaction audit trails (`inbound`, `consumption`, `adjustment`, `loss`).
- **N-Day Moving Average Forecast**:
  $$\text{Daily Burn Rate } (\bar{C}_N) = \frac{1}{N} \sum_{i=1}^{N} C_i$$
  $$\text{Days Remaining} = \frac{Q_{\text{on-hand}}}{\bar{C}_N}$$
- Multi-tier confidence scoring based on historical sample size and consumption volatility.

### ⚠️ Proactive Polar Alert Engine
Monitors 7 polar risk vectors with rule-based deduplication and alert lifecycle (`open` ➔ `acknowledged` ➔ `resolved`):
1. **Low Stock Alert**: Critical supplies below station winter threshold.
2. **Forecast Exhaustion Alert**: Projected runout prior to next seasonal shipping window.
3. **Delayed Vessel Alert**: Polar supply ship overdue past safe ice navigation window.
4. **Maintenance Due**: Critical life-support generators and PistenBullys overdue for cold-weather overhaul.
5. **Critical Incident SLA Breach**: Distress incident unacknowledged past the 15-minute response SLA.
6. **Cargo Arrived Not Received**: Unreconciled cargo idling on ice landing strip.
7. **Inventory Inconsistency**: Physical inventory disparity exceeding ledger tolerance.

### 🛟 Emergency Response & Search and Rescue (SAR)
- Incident categorization (medical, whiteout disorientation, crevasse fall, generator failure).
- Priority escalation and SOS emergency banner with live SLA countdown timer.
- Response expedition dispatch and real-time medical evacuation routing.

### 📶 Offline-First Operation
- Transparent local mutation queuing via `Dexie.js` (IndexedDB).
- Seamless automatic sync on satellite link reconnection with backend idempotency checks (`clientMutationId`).

---

## 👥 4. Role-Based Access Control (RBAC)

The system enforces strict role-based separation of concerns across 7 predefined accounts:

| Role | Demo Email | Password | Primary Clearance |
|---|---|---|---|
| **Admin** | `admin@polaris.dev` | `Polaris@2026` | Full system governance, user provisioning & station settings |
| **Expedition Coordinator** | `coordinator@polaris.dev` | `Polaris@2026` | Field route dispatch, traverse missions & crew safety |
| **Logistics Officer** | `logistics@polaris.dev` | `Polaris@2026` | Shipments, cargo manifests & ice-edge receipt |
| **Inventory Manager** | `inventory@polaris.dev` | `Polaris@2026` | Fuel reserves, rations, medical stock & audit logs |
| **Personnel Officer** | `personnel@polaris.dev` | `Polaris@2026` | Crew rosters, polar medical clearances & winter-over berths |
| **Emergency Coordinator** | `emergency@polaris.dev` | `Polaris@2026` | SOS distress response, SAR missions & incident SLA tracking |
| **Operations Viewer** | `ops@polaris.dev` | `Polaris@2026` | Read-only situational awareness & station telemetry |

---

## ⚡ 5. Quickstart & Installation

### Option 1: Docker Compose (Single Command)
```bash
docker-compose up -d --build
```
Access the application at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)

### Option 2: Local Development
#### 1. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds 3 stations, expeditions, cargo, inventory & users
npm run dev      # Starts API server on port 5000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts Vite dev server on port 5173
```

### Option 3: One-Click Vercel Deployment (All-in-One Full-Stack)
POLARIS is pre-configured with root [`vercel.json`](file:///d:/Projects/Integrated%20Polar%20Expedition%20Logistics%20and%20Asset%20Management%20System/vercel.json) and [`api/index.ts`](file:///d:/Projects/Integrated%20Polar%20Expedition%20Logistics%20and%20Asset%20Management%20System/api/index.ts) serverless functions.
1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New Project** and select this repo with Root Directory as `./`.
3. Set the Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas URI (e.g., `mongodb+srv://...`)
   - `JWT_ACCESS_SECRET`: 32+ character secret
   - `JWT_REFRESH_SECRET`: 32+ character secret
   - `NODE_ENV`: `production`
4. Click **Deploy**. Vercel will build the Vite frontend and route all `/api/*` endpoints to the serverless backend automatically on the same domain without CORS issues!

---

## 🎯 6. Judge-Facing 5-Minute Demo Script

Follow this script during hackathon evaluations to showcase the complete platform in 5 minutes:

### Minute 1: Command Dashboard & Situational Awareness
- Login as `admin@polaris.dev` (Password: `Polaris@2026`).
- Point out the Polar Station Selector (Maitri, Bharati, Dakshin Gangotri).
- Highlight the **Live Fuel Reserve** KPI, **Active Expeditions**, and the **Critical Alerts Banner**.
- Notice the **Simulated Data** indicator acknowledging non-live demonstration sensors.

### Minute 2: Inventory & Depletion Forecasting
- Navigate to **Inventory** ➔ Click on **Arctic Diesel Fuel (A-1)**.
- Show the **Depletion Forecast Curve**: explain the 14-day moving average calculation, projected days of fuel remaining, and confidence interval.
- Demonstrate posting an adjustment transaction to show real-time ledger auditing.

### Minute 3: Cargo Tracking & Automatic Receipt Reconciliation
- Navigate to **Cargo** ➔ Open shipment **SHP-2026-001 (MV Vasiliy Golovnin)**.
- Demonstrate receiving the cargo container.
- Navigate back to **Inventory**: show how incoming items were automatically reconciled into stock without manual duplicate entries.

### Minute 4: Emergency Response & Incident SLA
- Switch to **Emergency Response**.
- Observe the active whiteout vehicle breakdown incident with its live SLA countdown.
- Demonstrate **Acknowledging** the incident and assigning a rescue traverse expedition.

### Minute 5: Offline Resilience & Role Permissions
- Toggle the browser to **Offline** (or click the Offline simulation toggle).
- Log a field inventory transaction or draft report — show the **Pending Sync** badge.
- Toggle network back **Online** — show automatic queue flush and idempotency verification.
- Logout and log in as `ops@polaris.dev` to demonstrate strict read-only RBAC protection.

---

## 🔒 7. Known Limitations & Future Scope

| Area | Current Prototype (Hackathon) | Future Production Roadmap |
|---|---|---|
| **Satellite Uplink** | Simulated intermittent network with IndexedDB sync queue | Direct Iridium SBD (Short Burst Data) modem protocol bridge |
| **Forecasting Engine** | Node.js moving-average and seasonal burn rate calculation | Python FastAPI microservice with ARIMA / LSTM weather-correlated burn models |
| **Geospatial Tracking** | Map coordinates and waypoint telemetry | Real-time AIS vessel telemetry and handheld GPS beacon integration |
| **Biometric Telemetry** | Personnel medical clearance logs | Polar wearable integration for crew hypothermia & fatigue detection |
