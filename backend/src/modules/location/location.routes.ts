import { Router } from 'express';
import { LocationController } from './location.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

router.use(authenticate);

router.get('/', LocationController.getAllLocations);
router.get('/:id', LocationController.getLocationById);
router.post('/', authorize('admin'), LocationController.createLocation);
router.put('/:id', authorize('admin'), LocationController.updateLocation);
router.delete('/:id', authorize('admin'), LocationController.deleteLocation);

export default router;
