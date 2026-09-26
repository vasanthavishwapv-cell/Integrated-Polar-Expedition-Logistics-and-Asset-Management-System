import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Global singleton to avoid multiple clients in dev hot-reloading / Vercel serverless
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }]
        : [{ emit: 'event', level: 'error' }],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('TiDB (Prisma) connected');
  } catch (err) {
    logger.error({ err }, 'TiDB connection failed');
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw err;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
};
