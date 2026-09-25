import { Router } from 'express';
import * as ctrl from '../controllers/incidentController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { incidentSchema, incidentStatusSchema, incidentActionSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('incidents', 'read'), ctrl.listIncidents);
router.post('/', authorize('incidents', 'limited'), validate(incidentSchema), ctrl.createIncident);
router.get('/:id', authorize('incidents', 'read'), ctrl.getIncident);
router.put('/:id/status', authorize('incidents', 'full'), validate(incidentStatusSchema), ctrl.updateIncidentStatus);
router.post('/:id/actions', authorize('incidents', 'full'), validate(incidentActionSchema), ctrl.addResponseAction);

export default router;
