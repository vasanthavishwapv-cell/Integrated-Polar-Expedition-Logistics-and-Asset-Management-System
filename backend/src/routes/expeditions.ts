import { Router } from 'express';
import * as ctrl from '../controllers/expeditionController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { expeditionSchema, expeditionStatusSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('expeditions', 'read'), ctrl.listExpeditions);
router.post('/', authorize('expeditions', 'full'), validate(expeditionSchema), ctrl.createExpedition);
router.get('/:id', authorize('expeditions', 'read'), ctrl.getExpedition);
router.put('/:id', authorize('expeditions', 'full'), ctrl.updateExpedition);
router.delete('/:id', authorize('expeditions', 'full'), ctrl.deleteExpedition);

export default router;
