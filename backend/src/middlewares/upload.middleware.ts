import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { ApiResponse } from '../types/api.types';

// Custom storage engine
const storage: StorageEngine = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // Get transaction_id from request body or params
    const transactionId = req.body.transaction_id || req.params.transactionId;
    
    if (!transactionId) {
      cb(new Error('Transaction ID is required'), '');
      return;
    }

    // Create upload directory for this transaction
    const uploadDir = path.join(config.upload.path, transactionId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename: timestamp-originalname
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Accept images and common document types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed'));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles,
  },
  fileFilter,
});

// Excel import specific upload config
// Uses memory storage (no disk writes) and doesn't require transaction_id
const excelStorage: StorageEngine = multer.memoryStorage();

const excelFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Only allow Excel files
  const allowedExtensions = /\.xlsx$|\.xls$/i;
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  const hasValidExtension = allowedExtensions.test(file.originalname);
  const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);

  if (hasValidExtension || hasValidMimeType) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed'));
  }
};

export const uploadExcel = multer({
  storage: excelStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1, // Only one file at a time
  },
  fileFilter: excelFileFilter,
});

// Error handling middleware for multer
export const handleMulterError = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${config.upload.maxFileSize / 1024 / 1024}MB`,
        statusCode: 400,
      } as ApiResponse);
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        message: `Too many files. Maximum is ${config.upload.maxFiles} files`,
        statusCode: 400,
      } as ApiResponse);
      return;
    }
    res.status(400).json({
      success: false,
      message: err.message,
      statusCode: 400,
    } as ApiResponse);
    return;
  }

  if (err) {
    res.status(400).json({
      success: false,
      message: err.message,
      statusCode: 400,
    } as ApiResponse);
    return;
  }

  next();
};
