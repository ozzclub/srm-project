import { Router } from 'express';
import { MaterialTypeController } from './material-type.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public read routes (both admin and staff can view)
router.get('/', MaterialTypeController.getAllMaterialTypes);
router.get('/:id', MaterialTypeController.getMaterialTypeById);

// Admin only write routes
router.post('/', authorize('admin'), MaterialTypeController.createMaterialType);
router.put('/:id', authorize('admin'), MaterialTypeController.updateMaterialType);
router.delete('/:id', authorize('admin'), MaterialTypeController.deleteMaterialType);

export default router;
