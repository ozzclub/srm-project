import { Router } from 'express';
import { SPPController } from './spp.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { uploadExcel } from '../../middlewares/upload.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// IMPORTANT: Static routes MUST come before dynamic routes (:id)
// Otherwise, '/template' will match /:id with id='template'

// Static routes (no :id parameter)
router.get('/', SPPController.getAll);
router.get('/template', SPPController.downloadTemplate);
router.post('/import/preview', uploadExcel.single('file'), SPPController.previewImport);
router.post('/import', uploadExcel.single('file'), SPPController.importFromExcel);
router.post('/', SPPController.create);

// Dynamic routes with specific paths (more specific first)
router.get('/:id/fulfillment', SPPController.getFulfillmentStatus);
router.post('/:id/approve', SPPController.approve);
router.post('/:id/items', SPPController.addItem);
router.put('/items/:itemId', SPPController.updateItem);
router.post('/items/:itemId/receive', SPPController.receiveItem);
router.delete('/items/:itemId', SPPController.deleteItem);

// General dynamic routes (least specific - must be last)
router.get('/:id', SPPController.getById);
router.put('/:id', SPPController.update);
router.delete('/:id', SPPController.delete);

export default router;
