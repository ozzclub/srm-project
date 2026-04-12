import { Router } from 'express';
import { MovementLogController } from './movement-log.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', MovementLogController.getDashboardStats);
router.get('/', MovementLogController.getAllMovementLogs);
router.get('/trip/:tripId', MovementLogController.getMovementLogsByTripId);
router.get('/do/:documentNo', MovementLogController.getMovementLogsByDocumentNo);
router.get('/:id', MovementLogController.getMovementLogById);
router.post('/', MovementLogController.createMovementLog);
router.put('/:id', MovementLogController.updateMovementLog);
router.delete('/:id', authorize('admin'), MovementLogController.deleteMovementLog);

export default router;
