import { Request, Response } from 'express';
import { DocumentService } from './document.service';
import { ApiResponse } from '../../types/api.types';
import { UploadDocumentResponse } from '../../types/document.types';

export class DocumentController {
  // Upload documents
  static async uploadDocuments(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const { transaction_id, category } = req.body;

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files uploaded',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      if (!transaction_id) {
        res.status(400).json({
          success: false,
          message: 'Transaction ID is required',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const uploadedFiles = [];

      // Create document records for each file
      for (const file of files) {
        const document = await DocumentService.createDocument({
          transaction_id,
          file_url: file.filename,
          category: category || 'GENERAL',
          file_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          uploaded_by: req.user?.id,
        });

        uploadedFiles.push({
          id: document.id,
          file_url: document.file_url,
          file_name: (document as any).file_name || file.originalname,
          file_size: (document as any).file_size || file.size,
          mime_type: (document as any).mime_type || file.mimetype,
          category: document.category,
        });
      }

      const response: UploadDocumentResponse = {
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        data: {
          transaction_id,
          files: uploadedFiles,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Upload documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get documents by transaction ID
  static async getDocumentsByTransactionId(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      
      const documents = await DocumentService.getDocumentsByTransactionId(transactionId);
      
      // Add full URL to each document
      const documentsWithUrl = documents.map(doc => ({
        ...doc,
        file_full_url: `/uploads/${transactionId}/${doc.file_url}`,
      }));

      res.status(200).json({
        success: true,
        message: 'Documents retrieved successfully',
        data: documentsWithUrl,
      } as ApiResponse);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get document by ID
  static async getDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const document = await DocumentService.getDocumentById(parseInt(id));
      
      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Document retrieved successfully',
        data: document,
      } as ApiResponse);
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Delete document
  static async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleted = await DocumentService.deleteDocument(parseInt(id));
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }
}
