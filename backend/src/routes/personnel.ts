import { Router } from 'express';
import * as ctrl from '../controllers/personnelController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { personnelSchema, personnelMovementSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('personnel', 'read'), ctrl.listPersonnel);
router.post('/', authorize('personnel', 'full'), validate(personnelSchema), ctrl.createPersonnel);
router.get('/:id', authorize('personnel', 'limited'), ctrl.getPersonnel);
router.get('/:id/history', authorize('personnel', 'limited'), ctrl.getPersonnelHistory);
router.post('/movements', authorize('personnel', 'limited'), validate(personnelMovementSchema), ctrl.recordMovement);

export default router;
