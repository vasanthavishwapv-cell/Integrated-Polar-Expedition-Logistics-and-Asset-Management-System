import { config } from './config';
import { connectDB } from './config/database';
import app from './app';
import { initCounters } from './utils/idGenerator';
import { runAlertEngine } from './services/analyticsService';
import logger from './utils/logger';

const start = async () => {
  await connectDB();
  await initCounters();

  // Run alert engine every 5 minutes
  runAlertEngine().catch((e) => logger.error(e, 'Initial alert engine run failed'));
  setInterval(() => {
    runAlertEngine().catch((e) => logger.error(e, 'Alert engine run failed'));
  }, 5 * 60 * 1000);

  app.listen(config.port, () => {
    logger.info(`POLARIS backend running on port ${config.port} [${config.env}] — TiDB Cloud`);
  });
};

start().catch((err) => {
  logger.error(err, 'Server startup failed');
  process.exit(1);
});
