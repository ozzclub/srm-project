import { Router } from 'express';
import { MTOController } from './mto.controller';

const router = Router();

// MTO Requests routes
router.get('/', MTOController.getAll);
router.post('/', MTOController.create);
router.get('/:id', MTOController.getById);
router.put('/:id', MTOController.update);
router.delete('/:id', MTOController.delete);

// MTO Status update
router.put('/:id/status', MTOController.updateStatus);

// MTO Fulfillment status
router.get('/:id/fulfillment', MTOController.getFulfillmentStatus);

// MTO Items routes
router.post('/:id/items', MTOController.addItem);
router.put('/items/:itemId', MTOController.updateItem);
router.delete('/items/:itemId', MTOController.deleteItem);

export default router;
