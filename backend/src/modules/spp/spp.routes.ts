import { Router } from 'express';
import { SPPController } from './spp.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { uploadExcel } from '../../middlewares/upload.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// IMPORTANT: Static routes MUST come before dynamic routes (:id)
// Otherwise, '/template' will match /:id with id='template'

// Roles authorized to import/export/delete: admin, staff, site, material_site
const authActions = authorize('admin', 'staff', 'site', 'material_site');

// Static routes (no :id parameter)
router.get('/', SPPController.getAll);
router.get('/template', authActions, SPPController.downloadTemplate);
router.post('/import/preview', authActions, uploadExcel.single('file'), SPPController.previewImport);
router.post('/import', authActions, uploadExcel.single('file'), SPPController.importFromExcel);
router.post('/', SPPController.create);

// Dynamic routes with specific paths (more specific first)
router.get('/:id/fulfillment', SPPController.getFulfillmentStatus);
router.post('/:id/approve', SPPController.approve);
router.post('/:id/site-approve', SPPController.siteApprove);
router.post('/:id/items', SPPController.addItem);
router.put('/items/:itemId', SPPController.updateItem);
router.post('/items/:itemId/receive', SPPController.receiveItem);
router.put('/items/:itemId/delivery', SPPController.updateDelivery);

// NEW: SITE verification and direct receive routes
router.post('/items/:itemId/verify', SPPController.verifyDelivery);
router.post('/items/:itemId/direct-receive', SPPController.directReceive);
router.patch('/items/:itemId/item-type', SPPController.updateItemType);

// NEW: Return to Workshop routes
router.post('/items/:itemId/initiate-return', SPPController.initiateReturn);
router.post('/items/:itemId/verify-return', SPPController.verifyReturn);

router.delete('/items/:itemId', authActions, SPPController.deleteItem);

// General dynamic routes (least specific - must be last)
router.get('/:id', SPPController.getById);
router.put('/:id', SPPController.update);
router.delete('/:id', authActions, SPPController.delete);

export default router;
