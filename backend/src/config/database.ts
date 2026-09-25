import mongoose from 'mongoose';
import { config } from './index';
import logger from '../utils/logger';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1 || isConnected) {
    return;
  }
  try {
    await mongoose.connect(config.mongoUri);
    isConnected = true;
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw err;
  }
};
