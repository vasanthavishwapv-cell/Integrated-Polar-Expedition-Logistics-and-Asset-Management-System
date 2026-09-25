import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import expeditionRoutes from './routes/expeditions';
import shipmentRoutes from './routes/shipments';
import inventoryRoutes from './routes/inventory';
import personnelRoutes from './routes/personnel';
import assetRoutes from './routes/assets';
import incidentRoutes from './routes/incidents';
import alertRoutes from './routes/alerts';
import dashboardRoutes from './routes/dashboard';

const app = express();

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      // Allow localhost, vercel.app preview URLs, or configured CORS_ORIGIN
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('vercel.app') ||
        config.corsOrigin.includes(origin) ||
        config.corsOrigin === '*'
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow for demo flexibility
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'client-mutation-id'],
  })
);

// ── Body & Cookies ────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/v1/health', (_req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────
const v1 = '/api/v1';
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/expeditions`, expeditionRoutes);
app.use(`${v1}/shipments`, shipmentRoutes);
app.use(`${v1}/inventory`, inventoryRoutes);
app.use(`${v1}/personnel`, personnelRoutes);
app.use(`${v1}/assets`, assetRoutes);
app.use(`${v1}/incidents`, incidentRoutes);
app.use(`${v1}/alerts`, alertRoutes);
app.use(`${v1}/dashboard`, dashboardRoutes);
app.use(`${v1}`, dashboardRoutes); // /summary, /analytics, /stations

// ── Error Handlers ────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
