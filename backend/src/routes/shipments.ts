import { Router } from 'express';
import * as ctrl from '../controllers/shipmentController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { shipmentSchema, shipmentStatusSchema, shipmentReceiveSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('cargo', 'read'), ctrl.listShipments);
router.post('/', authorize('cargo', 'full'), validate(shipmentSchema), ctrl.createShipment);
router.get('/:id', authorize('cargo', 'read'), ctrl.getShipment);
router.put('/:id/status', authorize('cargo', 'full'), validate(shipmentStatusSchema), ctrl.updateShipmentStatus);
router.post('/:id/receive', authorize('cargo', 'limited'), validate(shipmentReceiveSchema), ctrl.receiveShipment);

export default router;
