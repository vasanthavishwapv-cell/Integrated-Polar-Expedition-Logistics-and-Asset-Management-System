import { Router } from 'express';
import * as ctrl from '../controllers/inventoryController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { inventoryItemSchema, inventoryTransactionSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('inventory', 'read'), ctrl.listInventory);
router.post('/', authorize('inventory', 'full'), validate(inventoryItemSchema), ctrl.createInventoryItem);
router.get('/transactions', authorize('inventory', 'read'), ctrl.listTransactions);
router.post('/transactions', authorize('inventory', 'limited'), validate(inventoryTransactionSchema), ctrl.recordTransaction);
router.get('/forecast/:itemId', authorize('inventory', 'read'), ctrl.getForecast);
router.get('/:id', authorize('inventory', 'read'), ctrl.getInventoryItem);
router.put('/:id', authorize('inventory', 'full'), ctrl.updateInventoryItem);

export default router;
