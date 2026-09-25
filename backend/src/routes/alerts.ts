import { Router } from 'express';
import * as ctrl from '../controllers/alertController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { alertAcknowledgeSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('alerts', 'read'), ctrl.listAlerts);
router.put('/:id/acknowledge', authorize('alerts', 'read'), validate(alertAcknowledgeSchema), ctrl.acknowledgeAlert);
// Admin-only: manually trigger alert engine
router.post('/run-engine', authorize('alerts', 'full'), ctrl.triggerAlertEngine);

export default router;
