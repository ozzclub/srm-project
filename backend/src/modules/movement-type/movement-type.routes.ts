import { Router } from 'express';
import { MovementTypeController } from './movement-type.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

router.use(authenticate);

router.get('/', MovementTypeController.getAllMovementTypes);
router.get('/:id', MovementTypeController.getMovementTypeById);
router.post('/', authorize('admin'), MovementTypeController.createMovementType);
router.put('/:id', authorize('admin'), MovementTypeController.updateMovementType);
router.delete('/:id', authorize('admin'), MovementTypeController.deleteMovementType);

export default router;
