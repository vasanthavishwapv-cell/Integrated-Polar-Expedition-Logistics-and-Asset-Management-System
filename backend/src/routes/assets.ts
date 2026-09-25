import { Router } from 'express';
import * as ctrl from '../controllers/assetController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { assetSchema, maintenanceRecordSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('assets', 'read'), ctrl.listAssets);
router.post('/', authorize('assets', 'full'), validate(assetSchema), ctrl.createAsset);
router.get('/:id', authorize('assets', 'read'), ctrl.getAsset);
router.put('/:id', authorize('assets', 'limited'), ctrl.updateAsset);  // station_ops can log faults
router.post('/:id/maintenance', authorize('assets', 'full'), validate(maintenanceRecordSchema), ctrl.addMaintenanceRecord);
router.get('/:id/maintenance', authorize('assets', 'read'), ctrl.getMaintenanceHistory);

export default router;
