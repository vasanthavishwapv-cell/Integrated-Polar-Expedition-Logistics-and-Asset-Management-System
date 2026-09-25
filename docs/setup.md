# POLARIS Setup & Quickstart Guide

This guide details instructions for setting up, running, testing, and demonstrating POLARIS.

## Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance running on `localhost:27017` OR Docker

---

## Option A: Running with Docker Compose (Recommended)

To run the entire stack (MongoDB + Backend + Frontend Nginx proxy) in containers:

```bash
# Build and start all services in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f
```

The application will be accessible at:
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/v1
- **MongoDB**: localhost:27017

---

## Option B: Running Locally (Development Mode)

### 1. Start MongoDB
Ensure MongoDB is running locally:
```bash
# Example with Docker:
docker run -d --name polaris-mongo -p 27017:27017 mongo:7.0
```

### 2. Configure and Start Backend

```bash
cd backend

# Install dependencies
npm install

# Seed the database with demo polar stations, crew, expeditions & alerts
npm run seed

# Start development server
npm run dev
```
The API server starts at `http://localhost:5000`.

### 3. Configure and Start Frontend

In a separate terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The UI dashboard opens at `http://localhost:5173`.

---

## Option C: Deploying to Vercel (All-in-One Full-Stack)

POLARIS is configured for zero-configuration, all-in-one deployment to Vercel. Both the React frontend SPA and the backend API (via Vercel Serverless Functions) run under a single Vercel project with no CORS overhead.

### 1. Push Code to GitHub / GitLab
Commit and push the project repository to your Git provider.

### 2. Import into Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your `POLARIS` repository.
3. Keep the **Root Directory** as `./` (the repository root). Vercel automatically detects [`vercel.json`](file:///d:/Projects/Integrated%20Polar%20Expedition%20Logistics%20and%20Asset%20Management%20System/vercel.json) and compiles the frontend with serverless function routing.
4. Add the following **Environment Variables** in the Vercel Dashboard:

| Variable | Description | Example Value |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://user:pass@cluster.mongodb.net/polaris?retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET` | Secret key for access tokens (32+ chars) | `polaris-prod-jwt-access-secret-2026-key` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens (32+ chars) | `polaris-prod-jwt-refresh-secret-2026-key` |
| `NODE_ENV` | Runtime environment | `production` |

5. Click **Deploy**.

### 3. Populating Initial Data on Cloud DB
To seed your cloud MongoDB Atlas database with the demo polar stations, crew, inventory, and expeditions:
```bash
# Set your Atlas URI in backend/.env then run:
cd backend
npm run seed
```

---

## Seed Accounts & Role Credentials

The database comes pre-populated with accounts for every operational polar role.

| Role | Email | Password | Primary Duties |
|---|---|---|---|
| **Administrator** | `admin@polaris.dev` | `Polaris@2026` | Full platform administration & user governance |
| **Expedition Coordinator** | `coordinator@polaris.dev` | `Polaris@2026` | Field route planning, traverse dispatch & crew safety |
| **Logistics Officer** | `logistics@polaris.dev` | `Polaris@2026` | Vessel manifests, container tracking & cargo receipt |
| **Inventory Manager** | `inventory@polaris.dev` | `Polaris@2026` | Safety stock monitoring, fuel audits & warehouse ledger |
| **Personnel Officer** | `personnel@polaris.dev` | `Polaris@2026` | Station occupancy, crew rosters & medical certs |
| **Emergency Coordinator** | `emergency@polaris.dev` | `Polaris@2026` | Distress alerts, SAR dispatch & incident SLA tracking |
| **Operations Viewer** | `ops@polaris.dev` | `Polaris@2026` | Read-only situational awareness & station telemetry |

---

## Running Verification Tests

```bash
# Backend unit & integration tests
cd backend
npm run test

# Frontend build verification
cd frontend
npm run build
```
