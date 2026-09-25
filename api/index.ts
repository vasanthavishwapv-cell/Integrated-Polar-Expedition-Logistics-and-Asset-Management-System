import type { Request, Response } from 'express';
import { connectDB } from '../backend/src/config/database';
import { initCounters } from '../backend/src/utils/idGenerator';
import app from '../backend/src/app';

let initialized = false;

export default async function handler(req: Request, res: Response) {
  try {
    if (!initialized) {
      await connectDB();
      try {
        await initCounters();
      } catch {
        // Counters already initialized or non-critical
      }
      initialized = true;
    }
    return app(req, res);
  } catch (error) {
    console.error('Vercel serverless handler error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error occurred in serverless function',
      },
    });
  }
}
