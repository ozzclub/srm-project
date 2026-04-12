import { Router } from 'express';
import { DocumentController } from './document.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { upload, handleMulterError } from '../../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);

// Upload documents (multipart/form-data)
router.post(
  '/upload',
  upload.array('files', 10),
  handleMulterError,
  DocumentController.uploadDocuments
);

// Get documents by transaction ID
router.get('/:transactionId', DocumentController.getDocumentsByTransactionId);

// Get document by ID
router.get('/detail/:id', DocumentController.getDocumentById);

// Delete document
router.delete('/:id', DocumentController.deleteDocument);

export default router;
