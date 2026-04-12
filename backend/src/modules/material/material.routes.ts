import { Router } from 'express';
import multer from 'multer';
import { MaterialController } from './material.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public read routes (both admin and staff can view)
router.get('/', MaterialController.getAllMaterials);
router.get('/template', MaterialController.downloadTemplate);  // Must be before /:id
router.get('/:id', MaterialController.getMaterialById);

// Admin only write routes
router.post('/', authorize('admin'), MaterialController.createMaterial);
router.put('/:id', authorize('admin'), MaterialController.updateMaterial);
router.delete('/:id', authorize('admin'), MaterialController.deleteMaterial);

// Import route (admin only) - single file upload with memory storage
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /xlsx|xls|openxmlformats/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop() || '');
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
});

router.post('/import', authorize('admin'), importUpload.single('file'), MaterialController.importMaterials);

// Preview import (admin only)
router.post('/import/preview', authorize('admin'), importUpload.single('file'), MaterialController.previewImport);

export default router;
