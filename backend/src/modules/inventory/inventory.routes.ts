import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all inventory items
router.get('/', InventoryController.getAll);

// Get inventory statistics
router.get('/stats', InventoryController.getStats);

// Get tools only
router.get('/tools', InventoryController.getTools);

// Get materials only
router.get('/materials', InventoryController.getMaterials);

// Get inventory by ID
router.get('/:id', InventoryController.getById);

// Create inventory item
router.post('/', InventoryController.create);

// Update inventory item
router.put('/:id', InventoryController.update);

// Delete inventory item
router.delete('/:id', InventoryController.delete);

export default router;
