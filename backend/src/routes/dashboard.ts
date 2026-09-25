import { Router } from 'express';
import * as ctrl from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { stationSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

// Dashboard endpoints (supports both /summary and /dashboard/summary)
router.get('/summary', ctrl.getDashboardSummary);
router.get('/dashboard/summary', ctrl.getDashboardSummary);
router.get('/analytics', ctrl.getDashboardAnalytics);
router.get('/dashboard/analytics', ctrl.getDashboardAnalytics);

// Station CRUD
router.get('/stations', ctrl.getStations);
router.post('/stations', validate(stationSchema), ctrl.createStation);
router.get('/stations/:id', ctrl.getStation);
router.put('/stations/:id', ctrl.updateStation);

export default router;
