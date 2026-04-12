import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

// Public route
router.post('/login', UserController.login);

// Protected routes
router.use(authenticate);

// Admin only routes
router.get('/', authorize('admin'), UserController.getAllUsers);
router.get('/:id', authorize('admin'), UserController.getUserById);
router.post('/', authorize('admin'), UserController.createUser);
router.put('/:id', authorize('admin'), UserController.updateUser);
router.delete('/:id', authorize('admin'), UserController.deleteUser);

export default router;
